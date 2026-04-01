import { EventType } from "@prisma/client";

import { prisma } from "../prisma";
import { extractDateHint, parseChineseDateHint } from "../utils/dates";
import { sha1 } from "../utils/hash";
import { parseJsonArray, stringifyJsonArray } from "../utils/json";
import { cleanText, extractKeywords, splitSentences, summarize } from "../utils/text";

const EVENT_TYPE_RULES: Array<{ type: EventType; keywords: string[] }> = [
  { type: "MEETING", keywords: ["常委会会议", "常务会议", "专题会议", "调度会", "推进会", "座谈会", "主持研究", "会议"] },
  { type: "RESEARCH", keywords: ["调研", "考察", "走访"] },
  { type: "PARTY_BUILDING", keywords: ["学习教育", "读书班", "教育整治", "党建", "组织工作", "巡视整改"] },
  { type: "MEETING_WITH", keywords: ["会见"] },
  { type: "ECONOMIC_WORK", keywords: ["经济运行", "投资", "产业", "营商环境", "外贸", "经贸", "招商", "创投", "签约", "签署协议"] },
  { type: "SAFETY_PRODUCTION", keywords: ["安全生产", "防汛", "消防", "风险排查"] },
  { type: "FOREIGN_AFFAIRS", keywords: ["外宾", "港澳", "台湾", "外资", "驻华大使", "国际交流"] },
  { type: "ATTENDANCE", keywords: ["出席", "参加", "致辞", "开幕"] },
  { type: "SPEECH", keywords: ["讲话", "批示", "致辞"] },
  { type: "INSPECTION", keywords: ["督导", "检查", "巡查"] },
  { type: "LIANGHUI", keywords: ["全国两会", "两会", "代表团", "全国人大", "全国政协", "审议政府工作报告"] }
];

export async function resolveLeaders(regionId: string, text: string, focusTexts: string[] = [text]) {
  const regionLeaders = await prisma.leader.findMany({
    where: {
      regionId,
      active: true
    }
  });

  for (const focusText of focusTexts) {
    const byNameOrAliasInFocus = regionLeaders.filter((leader) => {
      const aliases = parseJsonArray(leader.aliasesJson);
      return [leader.name, ...aliases].some((item) => item && focusText.includes(item));
    });

    if (byNameOrAliasInFocus.length > 0) {
      return byNameOrAliasInFocus;
    }
  }

  const byNameOrAliasInFullText = regionLeaders.filter((leader) => {
    const aliases = parseJsonArray(leader.aliasesJson);
    return [leader.name, ...aliases].some((item) => item && text.includes(item));
  });

  if (byNameOrAliasInFullText.length > 0) {
    return byNameOrAliasInFullText;
  }

  for (const focusText of focusTexts) {
    const byTitleInFocus = regionLeaders.filter((leader) => {
      const aliases = parseJsonArray(leader.aliasesJson);
      return [leader.officialTitle, leader.normalizedTitle, ...aliases].some((item) => item && focusText.includes(item));
    });

    if (byTitleInFocus.length > 0) {
      return byTitleInFocus;
    }
  }

  return [];
}

export function classifyEventType(text: string) {
  for (const rule of EVENT_TYPE_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.type;
    }
  }

  return "OTHER" satisfies EventType;
}

export function inferLocation(text: string) {
  const match = text.match(/在([^，。]{2,24})(调研|考察|督导|检查|会见|出席|召开|举行)/);

  if (!match) {
    return null;
  }

  const value = cleanText(match[1]).replace(/时强调$|时指出$|专题$/g, "");

  if (
    value === "京" ||
    value.includes("主持") ||
    value.includes("强调") ||
    value.includes("召开") ||
    value.includes("出席") ||
    value.includes("讲话") ||
    value.length > 20
  ) {
    return null;
  }

  return value;
}

function inferEventDate(input: {
  title: string;
  rawText: string;
  publishTime?: Date | null;
}) {
  const leadSentences = splitSentences(input.rawText).slice(0, 4).join("。");
  const leadWindow = cleanText(input.rawText).slice(0, 320);
  const candidates = [
    leadSentences,
    leadWindow,
    cleanText(`${input.title} ${leadSentences}`),
    input.title,
    cleanText(input.rawText).slice(0, 1200)
  ];

  for (const candidate of candidates) {
    const explicit = extractDateHint(candidate, input.publishTime);

    if (explicit) {
      return explicit;
    }
  }

  return parseChineseDateHint(cleanText(`${input.title} ${input.rawText}`), input.publishTime);
}

export function buildNormalizedTitle(input: {
  leaders: { name: string }[];
  eventType: EventType;
  locationText?: string | null;
  rawTitle: string;
}) {
  const leaderText = input.leaders.map((item) => item.name).join("、") || "相关领导";
  const rawTitle = cleanText(input.rawTitle);

  if (rawTitle.includes("调研") || rawTitle.includes("考察")) {
    return `${leaderText}${input.locationText ? `在${input.locationText}` : ""}调研`;
  }

  if (rawTitle.includes("主持召开") && rawTitle.includes("推进会")) {
    return `${leaderText}主持召开工作推进会`;
  }

  if (rawTitle.includes("主持召开") && rawTitle.includes("调度会")) {
    return `${leaderText}主持召开调度会`;
  }

  if (rawTitle.includes("常委会会议")) {
    return `${leaderText}主持召开省委常委会会议`;
  }

  if (rawTitle.includes("常务会议")) {
    return `${leaderText}主持召开省政府常务会议`;
  }

  if (rawTitle.includes("推进会")) {
    return `${leaderText}出席工作推进会`;
  }

  if (rawTitle.includes("读书班")) {
    return `${leaderText}参加学习教育读书班`;
  }

  if (rawTitle.includes("签署") || rawTitle.includes("签约")) {
    return `${leaderText}见证合作签约活动`;
  }

  if (rawTitle.includes("主持研究")) {
    return `${leaderText}主持研究专项工作`;
  }

  switch (input.eventType) {
    case "MEETING":
      return `${leaderText}主持召开重要会议`;
    case "RESEARCH":
      return `${leaderText}${input.locationText ? `在${input.locationText}` : ""}调研`;
    case "MEETING_WITH":
      return `${leaderText}会见有关方面负责人`;
    case "ATTENDANCE":
      return `${leaderText}出席重要活动`;
    case "SPEECH":
      return `${leaderText}作出讲话批示`;
    case "INSPECTION":
      return `${leaderText}${input.locationText ? `在${input.locationText}` : ""}督导检查`;
    case "LIANGHUI":
      return `${leaderText}参加两会相关活动`;
    case "ECONOMIC_WORK":
      return `${leaderText}部署经济工作`;
    case "SAFETY_PRODUCTION":
      return `${leaderText}部署安全生产工作`;
    case "PARTY_BUILDING":
      return `${leaderText}部署党建组织工作`;
    case "FOREIGN_AFFAIRS":
      return `${leaderText}开展外事或港澳台交流活动`;
    default:
      return cleanText(input.rawTitle);
  }
}

export function buildDedupKey(input: {
  regionCode: string;
  eventDate: Date;
  leaderNames: string[];
  eventType: EventType;
  keywords: string[];
}) {
  const dateKey = input.eventDate.toISOString().slice(0, 10);
  const payload = [
    input.regionCode,
    dateKey,
    input.eventType,
    input.leaderNames.sort().join("|"),
    input.keywords.slice(0, 4).join("|")
  ].join("::");

  return sha1(payload);
}

export async function extractEventDraft(rawArticleId: string) {
  const article = await prisma.rawArticle.findUniqueOrThrow({
    where: { id: rawArticleId },
    include: {
      candidateUrl: {
        include: {
          searchTask: {
            include: {
              region: true
            }
          }
        }
      },
      sourceSite: true
    }
  });

  const region = article.candidateUrl?.searchTask.region;

  if (!region) {
    throw new Error(`RawArticle ${rawArticleId} missing region context.`);
  }

  const fullText = cleanText(`${article.title} ${article.rawText}`);
  const titleText = cleanText(article.title);
  const leadText = cleanText(`${article.title} ${splitSentences(article.rawText).slice(0, 4).join("。")}`);
  const leaders = await resolveLeaders(region.id, fullText, [titleText, leadText]);
  const publishTime = article.publishTime ?? undefined;
  const eventDate = inferEventDate({
    title: article.title,
    rawText: article.rawText,
    publishTime
  });
  const eventType = classifyEventType(leadText);
  const locationText = inferLocation(leadText);
  const keywordList = extractKeywords(`${article.title} ${summarize(article.rawText, 2)}`);
  const normalizedTitle = buildNormalizedTitle({
    leaders,
    eventType,
    locationText,
    rawTitle: article.title
  });
  const confidenceScore = Math.min(
    0.98,
    0.45 +
      (leaders.length > 0 ? 0.2 : 0) +
      (article.credibilityLevel === "A" ? 0.2 : article.credibilityLevel === "B" ? 0.12 : 0.05) +
      (locationText ? 0.05 : 0.02) +
      (splitSentences(article.rawText).length > 1 ? 0.05 : 0)
  );

  return {
    region,
    leaders,
    eventDate,
    eventType,
    locationText,
    keywordsJson: stringifyJsonArray(keywordList),
    normalizedTitle,
    summary: summarize(article.rawText, 2),
    confidenceScore,
    dedupKey: buildDedupKey({
      regionCode: region.code,
      eventDate,
      leaderNames: leaders.map((item) => item.name),
      eventType,
      keywords: keywordList
    })
  };
}
