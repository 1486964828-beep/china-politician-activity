const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
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
          rawArticle: {
            include: {
              sourceSite: true
            }
          }
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
      }
    },
    orderBy: [{ eventDate: "desc" }, { updatedAt: "desc" }]
  });

  const payload = events.map((event) => ({
    id: event.id,
    region: {
      code: event.region.code,
      name: event.region.name,
      type: event.region.type
    },
    eventDate: event.eventDate.toISOString(),
    normalizedTitle: event.normalizedTitle,
    summary: event.summary,
    eventType: event.eventType,
    locationText: event.locationText,
    keywordsJson: event.keywordsJson,
    confidenceScore: event.confidenceScore,
    dedupKey: event.dedupKey,
    leaders: event.leaders.map((item) => ({
      id: item.id,
      roleInEvent: item.roleInEvent,
      leader: {
        id: item.leader.id,
        name: item.leader.name,
        roleType: item.leader.roleType,
        officialTitle: item.leader.officialTitle,
        normalizedTitle: item.leader.normalizedTitle
      }
    })),
    sources: event.sources.map((item) => ({
      id: item.id,
      isPrimary: item.isPrimary,
      matchScore: item.matchScore,
      extractionMethod: item.extractionMethod,
      rawArticle: {
        id: item.rawArticle.id,
        url: item.rawArticle.url,
        title: item.rawArticle.title,
        publishTime: item.rawArticle.publishTime ? item.rawArticle.publishTime.toISOString() : null,
        sourceName: item.rawArticle.sourceName,
        sourceDomain: item.rawArticle.sourceDomain,
        credibilityLevel: item.rawArticle.credibilityLevel,
        sourceSite: item.rawArticle.sourceSite
          ? {
              siteName: item.rawArticle.sourceSite.siteName,
              baseDomain: item.rawArticle.sourceSite.baseDomain
            }
          : null
      }
    }))
  }));

  const outputDir = path.join(process.cwd(), "data", "generated");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "events.json"), JSON.stringify(payload, null, 2), "utf8");
  console.log(`Exported ${payload.length} events to data/generated/events.json`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
