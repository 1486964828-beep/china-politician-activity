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

function extractTitle($: ReturnType<typeof load>) {
  return cleanText($("h1").first().text() || $("title").first().text() || "未命名文章");
}

function extractSourceName($: ReturnType<typeof load>) {
  const metaSource = $('meta[name="source"]').attr("content");
  const candidates = [
    metaSource,
    $(".source").first().text(),
    $(".article-source").first().text()
  ];

  return cleanText(candidates.find(Boolean) ?? "");
}

function extractBodyText($: ReturnType<typeof load>) {
  const selectors = ["article", "main", ".article-content", ".content", "#Zoom", ".TRS_Editor"];

  for (const selector of selectors) {
    const text = cleanText($(selector).first().text());

    if (text.length > 40) {
      return text;
    }
  }

  return cleanText($("body").text());
}

function extractPublishTime($: ReturnType<typeof load>, text: string) {
  const metaValue =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="publishdate"]').attr("content") ||
    $('meta[name="PubDate"]').attr("content");

  if (metaValue) {
    return new Date(metaValue);
  }

  const timeHint = cleanText($("time").first().text() || $(".time").first().text());
  return parseChineseDateHint(`${timeHint} ${text}`);
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
