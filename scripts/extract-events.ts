import { prisma } from "../lib/prisma";
import { extractEventDraft } from "../lib/pipeline/extract-event";

async function main() {
  const articles = await prisma.rawArticle.findMany({
    where: {
      articleStatus: "RAW",
      NOT: {
        credibilityLevel: "D"
      }
    },
    orderBy: { createdAt: "asc" }
  });

  let extracted = 0;

  for (const article of articles) {
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
        extractionMethod: "rule-based-v1"
      }
    });

    await prisma.rawArticle.update({
      where: { id: article.id },
      data: {
        articleStatus: "EXTRACTED"
      }
    });

    extracted += 1;
  }

  console.log(`Extracted ${extracted} event drafts.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
