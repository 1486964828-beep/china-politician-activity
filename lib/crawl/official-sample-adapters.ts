import { load } from "cheerio";
import type { Element } from "domhandler";

import { parseChineseDateHint } from "../utils/dates";

export type OfficialCandidate = {
  url: string;
  title: string;
  publishTime?: Date | null;
  discoveredFrom: string;
};

type RegionInput = {
  code: string;
  name: string;
  leaderNames: string[];
  start: string;
  end: string;
};

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
};

function buildPagedUrls(baseUrl: string, limit: number) {
  const urls = [baseUrl];

  for (let index = 1; index < limit; index += 1) {
    urls.push(baseUrl.replace(/index(\.(html|shtml))$/i, `index_${index}$1`));
  }

  return urls;
}

function buildNumericPageUrls(baseUrl: string, startPage: number, endPage: number) {
  const urls: string[] = [];

  for (let page = startPage; page <= endPage; page += 1) {
    urls.push(baseUrl.replace("{page}", String(page)));
  }

  return urls;
}

function buildNodePageUrls(baseUrl: string, count: number) {
  const urls = [baseUrl];

  for (let page = 2; page <= count; page += 1) {
    urls.push(baseUrl.replace(/\.html$/i, `_${page}.html`));
  }

  return urls;
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(baseUrl: string, href?: string | null) {
  if (!href) {
    return null;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function cleanText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseExplicitDate(text: string, referenceYear = 2026) {
  const normalized = cleanText(text);
  const full = normalized.match(/(20\d{2})-(\d{2})-(\d{2})/);

  if (full) {
    const [, year, month, day] = full;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const compact = normalized.match(/(\d{2})-(\d{2})/);

  if (compact) {
    const [, month, day] = compact;
    return new Date(Date.UTC(referenceYear, Number(month) - 1, Number(day)));
  }

  return parseChineseDateHint(normalized, new Date(Date.UTC(referenceYear, 0, 1)));
}

function parseDateFromUrl(url: string) {
  const slashDate = url.match(/\/(20\d{2})\/(\d{2})(\d{2})\//);

  if (slashDate) {
    const [, year, month, day] = slashDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const compactDate = url.match(/(?:^|[_/-])(20\d{2})(\d{2})(\d{2})(?:[_./-]|$)/);

  if (compactDate) {
    const [, year, month, day] = compactDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  return null;
}

function withinRange(date: Date | null | undefined, start: string, end: string) {
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  const value = date.toISOString().slice(0, 10);
  return value >= start && value <= end;
}

function titleHasLeader(title: string, leaderNames: string[]) {
  return leaderNames.some((name) => title.includes(name));
}

function extractDateHintFromNode($: ReturnType<typeof load>, element: Element) {
  const scope = $(element);
  const candidates = [
    scope.find("span").last().text(),
    scope.find(".Days").first().text(),
    scope.find(".time").first().text(),
    scope.text()
  ];

  return candidates.map((item) => cleanText(item)).find((item) => /\d{2,4}[-年]\d{1,2}[-月]\d{1,2}/.test(item) || /\d{2}-\d{2}/.test(item));
}

function uniqueCandidates(items: OfficialCandidate[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

function extractLinksFromPage(input: {
  html: string;
  pageUrl: string;
  leaderNames: string[];
  start: string;
  end: string;
  requireLeaderInTitle?: boolean;
  titleKeywords?: string[];
}) {
  const $ = load(input.html);
  const candidates: OfficialCandidate[] = [];
  const requireLeaderInTitle = input.requireLeaderInTitle ?? true;
  const titleKeywords = input.titleKeywords ?? [];

  $("li, .clearfix, .hbgov-list-block a, .page-content a, a[title]").each((_, element) => {
    const firstLink = $(element).is("a") ? $(element) : $(element).find("a").first();
    const href = firstLink.attr("href");
    const title = cleanText(firstLink.attr("title") || firstLink.text());

    if (!href || title.length < 6) {
      return;
    }

    const matchedLeader = titleHasLeader(title, input.leaderNames);
    const matchedKeyword = titleKeywords.some((keyword) => title.includes(keyword));

    if (requireLeaderInTitle && !matchedLeader && !matchedKeyword) {
      return;
    }

    const url = normalizeUrl(input.pageUrl, href);

    if (!url) {
      return;
    }

    const dateHint = extractDateHintFromNode($, element);
    const publishTime = dateHint ? parseExplicitDate(dateHint) : parseDateFromUrl(url);

    if (publishTime && !withinRange(publishTime, input.start, input.end)) {
      return;
    }

    candidates.push({
      url,
      title,
      publishTime,
      discoveredFrom: input.pageUrl
    });
  });

  return uniqueCandidates(candidates);
}

async function collectFromPagedList(input: {
  pageUrls: string[];
  leaderNames: string[];
  start: string;
  end: string;
  requireLeaderInTitle?: boolean;
  titleKeywords?: string[];
}) {
  const all: OfficialCandidate[] = [];

  for (const pageUrl of input.pageUrls) {
    try {
      const html = await fetchText(pageUrl);
      all.push(
        ...extractLinksFromPage({
          html,
          pageUrl,
          leaderNames: input.leaderNames,
          start: input.start,
          end: input.end,
          requireLeaderInTitle: input.requireLeaderInTitle,
          titleKeywords: input.titleKeywords
        })
      );
    } catch (error) {
      console.warn(`List fetch failed: ${pageUrl}`, error);
    }
  }

  return uniqueCandidates(all);
}

async function collectBeijing(input: RegionInput) {
  return collectFromPagedList({
    pageUrls: buildPagedUrls("https://www.beijing.gov.cn/gongkai/ldhd/index.html", 3),
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end
  });
}

async function collectGuangdong(input: RegionInput) {
  return collectFromPagedList({
    pageUrls: ["http://www.gd.gov.cn/gdywdt/index.html"],
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end
  });
}

async function collectZhejiang(input: RegionInput) {
  return collectFromPagedList({
    pageUrls: [
      "https://www.zj.gov.cn/col/col1229823372/index.html",
      "https://www.zj.gov.cn/col/col1554467/index.html",
      "https://www.zj.gov.cn/col/col1229823371/szfcwhy/index.html"
    ],
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end
  });
}

async function collectHubei(input: RegionInput) {
  return collectFromPagedList({
    pageUrls: buildPagedUrls("https://www.hubei.gov.cn/zwgk/hbyw/hbywqb/index.shtml", 4),
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end
  });
}

async function collectSichuan(input: RegionInput) {
  const general = await collectFromPagedList({
    pageUrls: [
      "http://www.sc.gov.cn/10462/wza2012/zfld/zfld.shtml",
      "http://www.sc.gov.cn/10462/wza2012/zwxx/zwxx.shtml"
    ],
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end
  });

  const leaderPage = await collectFromPagedList({
    pageUrls: ["http://www.sc.gov.cn/10462/szsxl/zfld_shixiaolin.shtml"],
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end,
    requireLeaderInTitle: false
  });

  const archive = await collectFromPagedList({
    pageUrls: buildPagedUrls("http://www.sc.gov.cn/10462/10464/10465/10466/list_ft.shtml", 4),
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end,
    requireLeaderInTitle: false
  });

  return uniqueCandidates([...general, ...leaderPage, ...archive]);
}

async function collectChengdu(input: RegionInput) {
  return collectFromPagedList({
    pageUrls: [
      ...buildNumericPageUrls("http://news.chengdu.cn/xwsy/bd/{page}.shtml", 1, 18),
      ...buildNumericPageUrls("http://news.chengdu.cn/xwsy/yc/{page}.shtml", 1, 5)
    ],
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end,
    requireLeaderInTitle: false,
    titleKeywords: ["陈书平", "曹立军", "市委书记", "市长", "市委常委会", "市政府", "政府常务会议", "政府党组会议", "市政府第"]
  });
}

async function collectHangzhou(input: RegionInput) {
  return collectFromPagedList({
    pageUrls: [
      ...buildNodePageUrls("https://hznews.hangzhou.com.cn/xinzheng/lf/node_210646.html", 2),
      ...buildNodePageUrls("https://hznews.hangzhou.com.cn/xinzheng/ygy/node_207280.html", 2)
    ],
    leaderNames: input.leaderNames,
    start: input.start,
    end: input.end,
    requireLeaderInTitle: false,
    titleKeywords: ["刘非", "姚高员", "市委常委会", "市政府党组", "市政府", "市长", "市委书记"]
  });
}

const REGION_ADAPTERS: Record<string, (input: RegionInput) => Promise<OfficialCandidate[]>> = {
  beijing: collectBeijing,
  guangdong: collectGuangdong,
  zhejiang: collectZhejiang,
  hubei: collectHubei,
  sichuan: collectSichuan,
  chengdu: collectChengdu,
  hangzhou: collectHangzhou
};

export async function collectOfficialCandidates(input: RegionInput) {
  const adapter = REGION_ADAPTERS[input.code];

  if (!adapter) {
    return [];
  }

  return adapter(input);
}
