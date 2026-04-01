import { EventType } from "@prisma/client";

import { prisma } from "../prisma";
import { parseChineseDateHint } from "../utils/dates";
import { sha1 } from "../utils/hash";
import { parseJsonArray, stringifyJsonArray } from "../utils/json";
import { cleanText, extractKeywords, splitSentences, summarize } from "../utils/text";

const EVENT_TYPE_RULES: Array<{ type: EventType; keywords: string[] }> = [
  { type: "LIANGHUI", keywords: ["代表团", "审议", "政协", "人大", "两会"] },
  { type: "SAFETY_PRODUCTION", keywords: ["安全生产", "防汛", "消防", "风险排查"] },
  { type: "MEETING_WITH", keywords: ["会见"] },
  { type: "FOREIGN_AFFAIRS", keywords: ["外宾", "港澳", "台湾", "外资"] },
  { type: "MEETING", keywords: ["常委会会议", "常务会议", "会议", "座谈会"] },
  { type: "RESEARCH", keywords: ["调研", "考察", "走访"] },
  { type: "INSPECTION", keywords: ["督导", "检查", "巡查"] },
  { type: "ECONOMIC_WORK", keywords: ["经济运行", "投资", "产业", "营商环境", "外贸"] },
  { type: "PARTY_BUILDING", keywords: ["党建", "组织工作", "巡视整改"] },
  { type: "SPEECH", keywords: ["讲话", "批示", "致辞"] },
  { type: "ATTENDANCE", keywords: ["出席", "参加"] }
];

export async function resolveLeaders(regionId: string, text: string) {
  const regionLeaders = await prisma.leader.findMany({
    where: {
      regionId,
      active: true
    }
  });

  return regionLeaders.filter((leader) => {
    const aliases = parseJsonArray(leader.aliasesJson);
    return [leader.name, leader.officialTitle, leader.normalizedTitle, ...aliases].some((item) => item && text.includes(item));
  });
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
  const match = text.match(/在([^，。]{2,18})(调研|召开|会见|出席|主持)/);
  return match?.[1] ?? null;
}

export function buildNormalizedTitle(input: {
  leaders: { name: string }[];
  eventType: EventType;
  locationText?: string | null;
  rawTitle: string;
}) {
  const leaderText = input.leaders.map((item) => item.name).join("、") || "相关领导";

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
  const leaders = await resolveLeaders(region.id, fullText);
  const publishTime = article.publishTime ?? undefined;
  const eventDate = parseChineseDateHint(fullText, publishTime);
  const eventType = classifyEventType(fullText);
  const locationText = inferLocation(fullText);
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
