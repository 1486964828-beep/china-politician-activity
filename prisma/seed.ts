import { PrismaClient } from "@prisma/client";

import { LEADER_SEEDS } from "../data/seeds/leaders";
import { REGION_SEEDS } from "../data/seeds/regions";
import { SOURCE_SITE_SEEDS } from "../data/seeds/source-sites";

const prisma = new PrismaClient();

async function main() {
  await prisma.eventSource.deleteMany();
  await prisma.eventLeader.deleteMany();
  await prisma.event.deleteMany();
  await prisma.rawArticle.deleteMany();
  await prisma.candidateUrl.deleteMany();
  await prisma.searchTask.deleteMany();
  await prisma.sourceSite.deleteMany();
  await prisma.leader.deleteMany();
  await prisma.region.deleteMany();

  const regionIdByCode = new Map<string, string>();

  for (const region of REGION_SEEDS) {
    const created = await prisma.region.create({
      data: {
        code: region.code,
        name: region.name,
        type: region.type
      }
    });

    regionIdByCode.set(region.code, created.id);
  }

  for (const leader of LEADER_SEEDS) {
    const regionId = regionIdByCode.get(leader.regionCode);

    if (!regionId) {
      throw new Error(`Missing region for leader seed: ${leader.regionCode}`);
    }

    await prisma.leader.create({
      data: {
        regionId,
        name: leader.name,
        roleType: leader.roleType,
        officialTitle: leader.officialTitle,
        normalizedTitle: leader.normalizedTitle,
        aliasesJson: JSON.stringify(leader.aliases),
        active: true
      }
    });
  }

  for (const sourceSite of SOURCE_SITE_SEEDS) {
    const regionId = regionIdByCode.get(sourceSite.regionCode);

    if (!regionId) {
      throw new Error(`Missing region for source seed: ${sourceSite.regionCode}`);
    }

    await prisma.sourceSite.create({
      data: {
        regionId,
        siteName: sourceSite.siteName,
        baseDomain: sourceSite.baseDomain,
        sourceType: sourceSite.sourceType,
        credibilityLevel: sourceSite.credibilityLevel,
        enabled: sourceSite.enabled,
        notes: sourceSite.notes
      }
    });
  }

  console.log(`Seed complete: ${REGION_SEEDS.length} regions, ${LEADER_SEEDS.length} leaders, ${SOURCE_SITE_SEEDS.length} source sites.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
