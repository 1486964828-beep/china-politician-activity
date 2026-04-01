import { load } from "cheerio";
import { chromium } from "playwright";

import { MOCK_ARTICLE_FIXTURES } from "../../data/mock/fixtures";
import { parseChineseDateHint } from "../utils/dates";
import { cleanText } from "../utils/text";

export type ArticleFetchResult = {
  title: string;
  publishTime?: Date | null;
  rawText: string;
  rawHtml?: string;
  sourceName?: string;
  sourceDomain?: string;
};

function detectEncoding(html: string) {
  const match = html.match(/<meta[^>]+charset=["']?([\w-]+)/i);
  return match?.[1]?.toLowerCase() ?? "utf-8";
}

function extractTitle($: ReturnType<typeof load>) {
  const metaTitle =
    $('meta[name="ArticleTitle"]').attr("content") ||
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="title"]').attr("content");

  return cleanText(
    metaTitle ||
      $(".hbgov-article-title").first().text() ||
      $(".wzbt").first().text() ||
      $("h1").first().text() ||
      $("title").first().text() ||
      "未命名文章"
  );
}

function extractSourceName($: ReturnType<typeof load>) {
  const metaSource =
    $('meta[name="ContentSource"]').attr("content") ||
    $('meta[name="source"]').attr("content") ||
    $('meta[name="SiteName"]').attr("content");
  const candidates = [
    metaSource,
    $(".laiyuan").first().text(),
    $(".hbgov-article-meta").first().text(),
    $(".source").first().text(),
    $(".article-source").first().text()
  ];

  return cleanText(candidates.find(Boolean) ?? "");
}

function stripNoiseFromScope($: ReturnType<typeof load>, selector: string) {
  $(selector)
    .find(
      [
        "script",
        "style",
        "noscript",
        "iframe",
        "header",
        "footer",
        "nav",
        ".share",
        ".share-box",
        ".fontZoom",
        ".hbgov-att-list-block",
        ".hbgov-pagenav-block",
        ".hbgov-qrcode-content",
        ".hbgov-share-block"
      ].join(", ")
    )
    .remove();
}

function normalizeBodyText(text: string) {
  return cleanText(
    text
      .replace(/编辑[:：][^\n。]{0,40}/g, " ")
      .replace(/责编[:：][^\n。]{0,40}/g, " ")
      .replace(/审核[:：][^\n。]{0,40}/g, " ")
      .replace(/扫一扫在手机上查看当前页面/g, " ")
  );
}

function extractBodyText($: ReturnType<typeof load>) {
  const selectors = [
    ".hbgov-article-content .view",
    ".hbgov-article-content",
    "#zoom",
    "#Zoom",
    ".bt_content",
    ".TRS_UEDITOR",
    ".TRS_Editor",
    ".article-content",
    ".content-main",
    ".news_content",
    ".pages_content",
    ".view",
    "article",
    "main",
    ".content"
  ];

  for (const selector of selectors) {
    const node = $(selector).first();

    if (!node.length) {
      continue;
    }

    stripNoiseFromScope($, selector);
    const text = normalizeBodyText(node.text());

    if (text.length > 40) {
      return text;
    }
  }

  const body = $("body").clone();
  body.find("script, style, noscript, iframe, header, footer, nav").remove();
  return normalizeBodyText(body.text());
}

function extractPublishTime($: ReturnType<typeof load>, text: string) {
  const metaValue =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="publishdate"]').attr("content") ||
    $('meta[name="PubDate"]').attr("content");

  if (metaValue) {
    return new Date(metaValue);
  }

  const timeHint = cleanText(
    $("time").first().text() ||
      $(".time").first().text() ||
      $(".hbgov-article-meta").first().text() ||
      $(".fwly").first().text()
  );
  return parseChineseDateHint(`${timeHint} ${text}`);
}

async function fetchHtmlByHttp(url: string) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP fetch failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const utf8Html = buffer.toString("utf8");
  const encoding = detectEncoding(utf8Html);

  if (encoding.includes("gb") || encoding.includes("gbk") || encoding.includes("gb2312")) {
    throw new Error(`Unsupported legacy encoding detected: ${encoding}`);
  }

  return utf8Html;
}

export async function fetchArticleByUrl(url: string): Promise<ArticleFetchResult> {
  const mockFixture = MOCK_ARTICLE_FIXTURES.find((fixture) => fixture.url === url);

  if (mockFixture) {
    return {
      title: mockFixture.title,
      publishTime: new Date(mockFixture.publishTime),
      rawText: mockFixture.rawText,
      rawHtml: mockFixture.rawHtml,
      sourceName: mockFixture.sourceName,
      sourceDomain: mockFixture.sourceDomain
    };
  }

  try {
    const html = await fetchHtmlByHttp(url);
    const $ = load(html);
    const rawText = extractBodyText($);

    if (rawText.length >= 80) {
      return {
        title: extractTitle($),
        publishTime: extractPublishTime($, rawText),
        rawText,
        rawHtml: html,
        sourceName: extractSourceName($),
        sourceDomain: new URL(url).hostname.replace(/^www\./, "")
      };
    }
  } catch {
    // Fall back to Playwright for JS-heavy or anti-bot pages.
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const html = await page.content();
    const $ = load(html);
    const rawText = extractBodyText($);

    return {
      title: extractTitle($),
      publishTime: extractPublishTime($, rawText),
      rawText,
      rawHtml: html,
      sourceName: extractSourceName($),
      sourceDomain: new URL(url).hostname.replace(/^www\./, "")
    };
  } finally {
    await browser.close();
  }
}
