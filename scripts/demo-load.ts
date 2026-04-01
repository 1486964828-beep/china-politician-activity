import { prisma } from "../lib/prisma";
import { MOCK_ARTICLE_FIXTURES } from "../data/mock/fixtures";
import { extractEventDraft } from "../lib/pipeline/extract-event";
import { runDeduplication } from "../lib/pipeline/dedup";
import { sha1 } from "../lib/utils/hash";

async function main() {
  await prisma.eventSource.deleteMany();
  await prisma.eventLeader.deleteMany();
  await prisma.event.deleteMany();
  await prisma.rawArticle.deleteMany();
  await prisma.candidateUrl.deleteMany();

  for (const fixture of MOCK_ARTICLE_FIXTURES) {
    if (fixture.credibilityLevel === "D") {
      continue;
    }

    const region = await prisma.region.findUniqueOrThrow({
      where: { code: fixture.regionCode }
    });

    const leader = await prisma.leader.findFirst({
      where: {
        regionId: region.id,
        name: {
          in: fixture.leaderNames
        }
      }
    });

    const sourceSite = await prisma.sourceSite.findFirst({
      where: {
        regionId: region.id,
        baseDomain: fixture.domain
      }
    });

    const searchTask = await prisma.searchTask.create({
      data: {
        regionId: region.id,
        leaderId: leader?.id,
        searchDate: new Date(`${fixture.eventDate}T00:00:00.000Z`),
        queryText: `${fixture.regionCode} ${fixture.leaderNames.join(" ")} ${fixture.title}`,
        engine: "mock",
        status: "COMPLETED"
      }
    });

    const candidate = await prisma.candidateUrl.create({
      data: {
        searchTaskId: searchTask.id,
        url: fixture.url,
        title: fixture.title,
        snippet: fixture.snippet,
        domain: fixture.domain,
        rank: 1,
        sourceSiteId: sourceSite?.id,
        sourceConfidence: fixture.credibilityLevel === "A" ? 0.98 : fixture.credibilityLevel === "B" ? 0.9 : 0.78,
        isOfficialCandidate: true,
        fetchStatus: "FETCHED"
      }
    });

    await prisma.rawArticle.create({
      data: {
        candidateUrlId: candidate.id,
        sourceSiteId: sourceSite?.id,
        url: fixture.url,
        title: fixture.title,
        publishTime: new Date(fixture.publishTime),
        rawText: fixture.rawText,
        rawHtml: fixture.rawHtml,
        sourceName: fixture.sourceName,
        sourceDomain: fixture.sourceDomain,
        credibilityLevel: fixture.credibilityLevel,
        checksum: sha1(fixture.rawText),
        articleStatus: "RAW"
      }
    });
  }

  const rawArticles = await prisma.rawArticle.findMany({
    where: { articleStatus: "RAW" },
    orderBy: { createdAt: "asc" }
  });

  for (const article of rawArticles) {
    const draft = await extractEventDraft(article.id);
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
      await prisma.eventLeader.create({
        data: {
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
        extractionMethod: "demo-load"
      }
    });

    await prisma.rawArticle.update({
      where: { id: article.id },
      data: { articleStatus: "EXTRACTED" }
    });
  }

  const dedup = await runDeduplication();
  const eventCount = await prisma.event.count();
  console.log(`Demo data loaded. Events: ${eventCount}, merged: ${dedup.mergedCount}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
