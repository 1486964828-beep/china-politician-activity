import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../lib/prisma";
import { collectOfficialCandidates } from "../lib/crawl/official-sample-adapters";
import { fetchArticleByUrl } from "../lib/pipeline/article-fetcher";
import { runDeduplication } from "../lib/pipeline/dedup";
import { extractEventDraft } from "../lib/pipeline/extract-event";
import { matchSourceForRegion } from "../lib/pipeline/source-matcher";
import { getArgValue, hasFlag } from "../lib/utils/args";
import { formatIsoDate } from "../lib/utils/dates";
import { sha1 } from "../lib/utils/hash";
import { parseJsonArray } from "../lib/utils/json";

const SAMPLE_REGION_CODES = ["beijing", "guangdong", "zhejiang", "hubei", "sichuan"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReportFileName(input: {
  start: string;
  end: string;
  targetRegions: string[];
  roleArg?: string | null;
}) {
  if (input.targetRegions.length === SAMPLE_REGION_CODES.length && !input.roleArg) {
    return "sample-official-report.json";
  }

  const regionPart = input.targetRegions.join("-");
  const rolePart = input.roleArg ? `.${input.roleArg}` : "";
  return `sample-official-report.${regionPart}${rolePart}.${input.start}.${input.end}.json`;
}

function withinRange(date: Date, start: string, end: string) {
  const value = formatIsoDate(date);
  return value >= start && value <= end;
}

async function main() {
  const start = getArgValue("--start", "2026-03-20")!;
  const end = getArgValue("--end", "2026-03-31")!;
  const regionArg = getArgValue("--regions");
  const leaderArg = getArgValue("--leader");
  const roleArg = getArgValue("--role");
  const reset = hasFlag("--reset");
  const targetRegions = regionArg ? regionArg.split(",").map((item) => item.trim()).filter(Boolean) : SAMPLE_REGION_CODES;
  const eventLeaderWhere = leaderArg || roleArg
    ? {
        leaders: {
          some: {
            leader: {
              ...(leaderArg ? { name: leaderArg } : {}),
              ...(roleArg ? { roleType: roleArg as never } : {})
            }
          }
        }
      }
    : {};

  if (reset) {
    await prisma.eventSource.deleteMany();
    await prisma.eventLeader.deleteMany();
    await prisma.event.deleteMany();
    await prisma.rawArticle.deleteMany();
    await prisma.candidateUrl.deleteMany();
    await prisma.searchTask.deleteMany();
  }

  const regions = await prisma.region.findMany({
    where: {
      code: {
        in: targetRegions
      }
    },
    include: {
      leaders: {
        where: {
          active: true,
          ...(leaderArg ? { name: leaderArg } : {}),
          ...(roleArg ? { roleType: roleArg as never } : {})
        }
      },
      sourceSites: {
        where: {
          enabled: true
        }
      }
    },
    orderBy: {
      code: "asc"
    }
  });

  let searchTaskCount = 0;
  let candidateCount = 0;

  for (const region of regions) {
    if (region.leaders.length === 0) {
      continue;
    }

    const taskQueryText = `official-adapter:${region.code}:${start}:${end}:${leaderArg ?? "all"}:${roleArg ?? "all"}`;
    const taskDate = new Date(`${start}T00:00:00.000Z`);
    const task =
      (await prisma.searchTask.findFirst({
        where: {
          regionId: region.id,
          searchDate: taskDate,
          queryText: taskQueryText,
          engine: "official-adapter"
        }
      })) ??
      (await prisma.searchTask.create({
        data: {
          regionId: region.id,
          searchDate: taskDate,
          queryText: taskQueryText,
          engine: "official-adapter",
          status: "PENDING"
        }
      }));

    searchTaskCount += 1;

    try {
      const candidates = await collectOfficialCandidates({
        code: region.code,
        name: region.name,
        leaderNames: region.leaders.map((item) => item.name),
        start,
        end
      });

      for (const candidate of candidates) {
        const domain = new URL(candidate.url).hostname.replace(/^www\./, "");
        const matched = await matchSourceForRegion({
          regionId: region.id,
          domain,
          title: candidate.title,
          snippet: candidate.discoveredFrom
        });

        if (!matched.isOfficialCandidate) {
          continue;
        }

        await prisma.candidateUrl.upsert({
          where: {
            searchTaskId_url: {
              searchTaskId: task.id,
              url: candidate.url
            }
          },
          update: {
            title: candidate.title || null,
            snippet: candidate.discoveredFrom,
            domain,
            sourceSiteId: matched.sourceSiteId,
            sourceConfidence: matched.confidence,
            isOfficialCandidate: true
          },
          create: {
            searchTaskId: task.id,
            url: candidate.url,
            title: candidate.title || null,
            snippet: candidate.discoveredFrom,
            domain,
            sourceSiteId: matched.sourceSiteId,
            sourceConfidence: matched.confidence,
            isOfficialCandidate: true,
            fetchStatus: "PENDING"
          }
        });

        candidateCount += 1;
      }

      await prisma.searchTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED" }
      });
    } catch (error) {
      console.error(`Official discovery failed for ${region.code}`, error);
      await prisma.searchTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "FAILED"
        }
      });
    }
  }

  const candidates = await prisma.candidateUrl.findMany({
    where: {
      isOfficialCandidate: true,
      fetchStatus: "PENDING"
    },
    include: {
      searchTask: true
    },
    orderBy: [
      {
        domain: "asc"
      },
      {
        discoveredAt: "asc"
      }
    ]
  });

  let fetched = 0;

  for (const candidate of candidates) {
      const existing = await prisma.rawArticle.findUnique({
        where: { url: candidate.url }
      });

      if (!existing) {
      try {
        const article = await fetchArticleByUrl(candidate.url);
        const sourceDomain = article.sourceDomain ?? candidate.domain;
        const match = await matchSourceForRegion({
          regionId: candidate.searchTask.regionId,
          domain: sourceDomain,
          title: article.title,
          snippet: candidate.snippet
        });

        await prisma.rawArticle.create({
          data: {
            candidateUrlId: candidate.id,
            sourceSiteId: match.sourceSiteId ?? candidate.sourceSiteId,
            url: candidate.url,
            title: article.title,
            publishTime: article.publishTime ?? null,
            rawText: article.rawText,
            rawHtml: article.rawHtml,
            sourceName: article.sourceName,
            sourceDomain,
            credibilityLevel: match.credibilityLevel,
            checksum: sha1(article.rawText),
            articleStatus: match.credibilityLevel === "D" ? "IGNORED" : "RAW"
          }
        });
      } catch (error) {
        console.error(`Fetch failed: ${candidate.url}`, error);
        await prisma.candidateUrl.update({
          where: {
            id: candidate.id
          },
          data: {
            fetchStatus: "FAILED"
          }
        });
        continue;
      }
    } else if (!existing.candidateUrlId) {
      await prisma.rawArticle.update({
        where: { id: existing.id },
        data: { candidateUrlId: candidate.id }
      });
    }

    await prisma.candidateUrl.update({
      where: {
        id: candidate.id
      },
      data: {
        fetchStatus: "FETCHED"
      }
    });

    fetched += 1;
    await sleep(120);
  }

  const rawArticles = await prisma.rawArticle.findMany({
    where: {
      articleStatus: "RAW"
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  let extracted = 0;

  for (const article of rawArticles) {
    const linkedSource = await prisma.eventSource.findFirst({
      where: {
        rawArticleId: article.id
      }
    });

    if (linkedSource) {
      await prisma.rawArticle.update({
        where: { id: article.id },
        data: { articleStatus: "EXTRACTED" }
      });
      continue;
    }

    const draft = await extractEventDraft(article.id);

    if (draft.leaders.length === 0 || !withinRange(draft.eventDate, start, end)) {
      await prisma.rawArticle.update({
        where: {
          id: article.id
        },
        data: {
          articleStatus: "IGNORED"
        }
      });
      continue;
    }

    const event = await prisma.event.create({
      data: {
        regionId: draft.region.id,
        eventDate: draft.eventDate,
        normalizedTitle: draft.normalizedTitle,
        summary: draft.summary,
        eventType: draft.eventType,
        locationText: draft.locationText,
        keywordsJson: draft.keywordsJson,
        confidenceScore: draft.confidenceScore,
        dedupKey: draft.dedupKey
      }
    });

    for (const leader of draft.leaders) {
      await prisma.eventLeader.upsert({
        where: {
          eventId_leaderId: {
            eventId: event.id,
            leaderId: leader.id
          }
        },
        update: {},
        create: {
          eventId: event.id,
          leaderId: leader.id,
          roleInEvent: leader.normalizedTitle
        }
      });
    }

    await prisma.eventSource.create({
      data: {
        eventId: event.id,
        rawArticleId: article.id,
        isPrimary: true,
        matchScore: 1,
        extractionMethod: "official-adapter"
      }
    });

    await prisma.rawArticle.update({
      where: {
        id: article.id
      },
      data: {
        articleStatus: "EXTRACTED"
      }
    });

    extracted += 1;
  }

  const dedup = await runDeduplication();

  const events = await prisma.event.findMany({
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
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
      }
    },
    where: {
      eventDate: {
        gte: new Date(`${start}T00:00:00.000Z`),
        lte: new Date(`${end}T23:59:59.999Z`)
      },
      region: {
        code: {
          in: targetRegions
        }
      },
      ...eventLeaderWhere
    },
    orderBy: [{ eventDate: "asc" }, { regionId: "asc" }, { createdAt: "asc" }]
  });

  const report = events.map((event) => ({
    date: formatIsoDate(event.eventDate),
    region: event.region.name,
    leaders: event.leaders.map((item) => ({
      name: item.leader.name,
      title: item.leader.officialTitle
    })),
    title: event.normalizedTitle,
    summary: event.summary,
    eventType: event.eventType,
    locationText: event.locationText,
    sourceCount: event.sources.length,
    sourceUrls: event.sources.map((item) => item.rawArticle.url),
    sourceTitles: event.sources.map((item) => item.rawArticle.title),
    sourcePublishTimes: event.sources.map((item) => item.rawArticle.publishTime?.toISOString() ?? null),
    keywords: parseJsonArray(event.keywordsJson)
  }));

  const outputDir = join(process.cwd(), "data", "generated");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(
      outputDir,
      buildReportFileName({
        start,
        end,
        targetRegions,
        roleArg
      })
    ),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        provider: "official-adapter",
        searchTaskCount,
        candidateCount,
        fetched,
        extracted,
        merged: dedup.mergedCount,
        finalEvents: events.length
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
