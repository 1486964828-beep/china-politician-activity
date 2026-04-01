import { CredibilityLevel, EventType } from "@prisma/client";

import { prisma } from "../prisma";
import { withinDays } from "../utils/dates";
import { buildDedupKey } from "./extract-event";
import { parseJsonArray, stringifyJsonArray } from "../utils/json";
import { jaccardSimilarity, tokenize } from "../utils/text";

function credibilityScore(level?: CredibilityLevel | null) {
  return {
    A: 1,
    B: 0.85,
    C: 0.7,
    D: 0.2
  }[level ?? "D"];
}

function typeSimilarity(a: EventType, b: EventType) {
  if (a === b) {
    return 1;
  }

  if (
    (a === "MEETING" && b === "ECONOMIC_WORK") ||
    (a === "ECONOMIC_WORK" && b === "MEETING") ||
    (a === "FOREIGN_AFFAIRS" && b === "MEETING_WITH") ||
    (a === "MEETING_WITH" && b === "FOREIGN_AFFAIRS")
  ) {
    return 0.75;
  }

  return 0.2;
}

function overlap<T>(left: T[], right: T[]) {
  const set = new Set(left);
  return right.some((item) => set.has(item));
}

function computeMatchScore(a: Awaited<ReturnType<typeof loadEventDrafts>>[number], b: Awaited<ReturnType<typeof loadEventDrafts>>[number]) {
  const leaderOverlap = overlap(
    a.leaders.map((item) => item.leader.name),
    b.leaders.map((item) => item.leader.name)
  )
    ? 1
    : 0;

  const titleSimilarity = jaccardSimilarity(tokenize(a.normalizedTitle), tokenize(b.normalizedTitle));
  const summarySimilarity = jaccardSimilarity(tokenize(a.summary ?? ""), tokenize(b.summary ?? ""));
  const locationSimilarity =
    a.locationText && b.locationText
      ? jaccardSimilarity(tokenize(a.locationText), tokenize(b.locationText))
      : 0.2;

  return 0.32 * leaderOverlap + 0.24 * titleSimilarity + 0.22 * summarySimilarity + 0.12 * locationSimilarity + 0.1 * typeSimilarity(a.eventType, b.eventType);
}

async function loadEventDrafts() {
  return prisma.event.findMany({
    include: {
      region: true,
      leaders: {
        include: {
          leader: true
        }
      },
      sources: {
        include: {
          rawArticle: true
        }
      }
    },
    orderBy: [
      { eventDate: "asc" },
      { createdAt: "asc" }
    ]
  });
}

async function pickPrimarySource(eventId: string) {
  const sources = await prisma.eventSource.findMany({
    where: { eventId },
    include: { rawArticle: true }
  });

  const best = sources
    .map((item) => ({
      ...item,
      score:
        credibilityScore(item.rawArticle.credibilityLevel) * 0.7 +
        item.matchScore * 0.2 +
        (item.rawArticle.publishTime ? 0.1 : 0)
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!best) {
    return;
  }

  await prisma.eventSource.updateMany({
    where: { eventId },
    data: { isPrimary: false }
  });

  await prisma.eventSource.update({
    where: { id: best.id },
    data: { isPrimary: true }
  });
}

async function mergeEvents(primaryId: string, duplicateId: string, matchScore: number) {
  const duplicate = await prisma.event.findUniqueOrThrow({
    where: { id: duplicateId },
    include: {
      region: true,
      leaders: true,
      sources: {
        include: {
          rawArticle: true
        }
      }
    }
  });

  const primary = await prisma.event.findUniqueOrThrow({
    where: { id: primaryId },
    include: {
      region: true,
      leaders: true,
      sources: true
    }
  });

  for (const leader of duplicate.leaders) {
    await prisma.eventLeader.upsert({
      where: {
        eventId_leaderId: {
          eventId: primaryId,
          leaderId: leader.leaderId
        }
      },
      update: {},
      create: {
        eventId: primaryId,
        leaderId: leader.leaderId,
        roleInEvent: leader.roleInEvent
      }
    });
  }

  for (const source of duplicate.sources) {
    await prisma.eventSource.upsert({
      where: {
        eventId_rawArticleId: {
          eventId: primaryId,
          rawArticleId: source.rawArticleId
        }
      },
      update: {
        matchScore: Math.max(source.matchScore, matchScore)
      },
      create: {
        eventId: primaryId,
        rawArticleId: source.rawArticleId,
        isPrimary: false,
        matchScore,
        extractionMethod: "dedup-merge"
      }
    });
  }

  const mergedKeywords = stringifyJsonArray([
    ...parseJsonArray(primary.keywordsJson),
    ...parseJsonArray(duplicate.keywordsJson)
  ]);

  const mergedDate = primary.eventDate <= duplicate.eventDate ? primary.eventDate : duplicate.eventDate;
  const mergedConfidence = Math.max(primary.confidenceScore, duplicate.confidenceScore, matchScore);
  const leaderNames = await prisma.eventLeader.findMany({
    where: { eventId: primaryId },
    include: { leader: true }
  });

  await prisma.event.update({
    where: { id: primaryId },
    data: {
      eventDate: mergedDate,
      summary: primary.summary?.length && primary.summary.length >= (duplicate.summary?.length ?? 0) ? primary.summary : duplicate.summary,
      locationText: primary.locationText || duplicate.locationText,
      confidenceScore: mergedConfidence,
      keywordsJson: mergedKeywords,
      dedupKey: buildDedupKey({
        regionCode: primary.region.code,
        eventDate: mergedDate,
        leaderNames: leaderNames.map((item) => item.leader.name),
        eventType: primary.eventType,
        keywords: parseJsonArray(mergedKeywords)
      })
    }
  });

  await prisma.event.delete({
    where: { id: duplicateId }
  });

  await pickPrimarySource(primaryId);
}

export async function runDeduplication() {
  const events = await loadEventDrafts();
  const consumed = new Set<string>();
  let mergedCount = 0;

  for (let index = 0; index < events.length; index += 1) {
    const current = events[index];

    if (consumed.has(current.id)) {
      continue;
    }

    for (let pointer = index + 1; pointer < events.length; pointer += 1) {
      const candidate = events[pointer];

      if (consumed.has(candidate.id) || current.regionId !== candidate.regionId) {
        continue;
      }

      if (!withinDays(current.eventDate, candidate.eventDate, 1)) {
        continue;
      }

      const score = computeMatchScore(current, candidate);

      if (score >= 0.68) {
        consumed.add(candidate.id);
        await mergeEvents(current.id, candidate.id, score);
        mergedCount += 1;
      }
    }

    await pickPrimarySource(current.id);
  }

  return { mergedCount };
}
