import { MOCK_ARTICLE_FIXTURES } from "../data/mock/fixtures";
import { prisma } from "../lib/prisma";
import { matchSourceForRegion } from "../lib/pipeline/source-matcher";
import { getSearchProvider } from "../lib/search/factory";
import { getArgValue } from "../lib/utils/args";
import { getMonthBounds } from "../lib/utils/dates";

async function main() {
  const month = getArgValue("--month");
  const providerName = getArgValue("--provider", "mock")!;
  const provider = getSearchProvider(providerName);
  const bounds = month ? getMonthBounds(month) : null;
  const mockRegionCodes = Array.from(new Set(MOCK_ARTICLE_FIXTURES.map((item) => item.regionCode)));

  if (providerName === "mock") {
    await prisma.searchTask.updateMany({
      where: {
        status: "PENDING",
        region: {
          code: {
            notIn: mockRegionCodes
          }
        }
      },
      data: {
        status: "COMPLETED"
      }
    });
  }

  const tasks = await prisma.searchTask.findMany({
    where: {
      status: "PENDING",
      ...(providerName === "mock"
        ? {
            region: {
              code: {
                in: mockRegionCodes
              }
            }
          }
        : {}),
      ...(month
        ? {
            searchDate: {
              gte: bounds!.start,
              lt: bounds!.end
            }
          }
        : {})
    },
    include: {
      region: true,
      leader: true
    },
    orderBy: { createdAt: "asc" }
  });

  let candidateCount = 0;

  for (const task of tasks) {
    const results = await provider.search({
      region: task.region,
      leader: task.leader,
      searchDate: task.searchDate,
      queryText: task.queryText
    });

    for (const result of results) {
      const matched = await matchSourceForRegion({
        regionId: task.regionId,
        domain: result.domain,
        title: result.title,
        snippet: result.snippet
      });

      await prisma.candidateUrl.upsert({
        where: {
          searchTaskId_url: {
            searchTaskId: task.id,
            url: result.url
          }
        },
        update: {
          title: result.title,
          snippet: result.snippet,
          domain: result.domain,
          rank: result.rank,
          sourceSiteId: matched.sourceSiteId,
          sourceConfidence: matched.confidence,
          isOfficialCandidate: matched.isOfficialCandidate
        },
        create: {
          searchTaskId: task.id,
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          domain: result.domain,
          rank: result.rank,
          sourceSiteId: matched.sourceSiteId,
          sourceConfidence: matched.confidence,
          isOfficialCandidate: matched.isOfficialCandidate,
          fetchStatus: matched.isOfficialCandidate ? "PENDING" : "SKIPPED"
        }
      });

      candidateCount += 1;
    }

    await prisma.searchTask.update({
      where: { id: task.id },
      data: { status: "COMPLETED" }
    });
  }

  console.log(`Ingested ${candidateCount} candidate rows from ${provider.name}.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
