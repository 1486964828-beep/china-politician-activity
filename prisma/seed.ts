import { PrismaClient } from "@prisma/client";

import { LEADER_SEEDS } from "../data/seeds/leaders";
import { REGION_SEEDS } from "../data/seeds/regions";
import { SOURCE_SITE_SEEDS } from "../data/seeds/source-sites";

const prisma = new PrismaClient();

async function main() {
  const regionIdByCode = new Map<string, string>();

  for (const region of REGION_SEEDS) {
    const created = await prisma.region.upsert({
      where: {
        code: region.code
      },
      update: {
        name: region.name,
        level: region.level ?? "PROVINCE",
        type: region.type
      },
      create: {
        code: region.code,
        name: region.name,
        level: region.level ?? "PROVINCE",
        type: region.type
      }
    });

    regionIdByCode.set(region.code, created.id);
  }

  for (const region of REGION_SEEDS) {
    if (!region.parentCode) {
      continue;
    }

    const regionId = regionIdByCode.get(region.code);
    const parentId = regionIdByCode.get(region.parentCode);

    if (!regionId || !parentId) {
      throw new Error(`Missing region relationship: ${region.code} -> ${region.parentCode}`);
    }

    await prisma.region.update({
      where: { id: regionId },
      data: { parentId }
    });
  }

  for (const leader of LEADER_SEEDS) {
    const regionId = regionIdByCode.get(leader.regionCode);

    if (!regionId) {
      throw new Error(`Missing region for leader seed: ${leader.regionCode}`);
    }

    const existing = await prisma.leader.findFirst({
      where: {
        regionId,
        name: leader.name,
        roleType: leader.roleType,
        active: true
      }
    });

    if (existing) {
      await prisma.leader.update({
        where: { id: existing.id },
        data: {
          officialTitle: leader.officialTitle,
          normalizedTitle: leader.normalizedTitle,
          aliasesJson: JSON.stringify(leader.aliases)
        }
      });
      continue;
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

    await prisma.sourceSite.upsert({
      where: {
        regionId_baseDomain: {
          regionId,
          baseDomain: sourceSite.baseDomain
        }
      },
      update: {
        siteName: sourceSite.siteName,
        sourceType: sourceSite.sourceType,
        credibilityLevel: sourceSite.credibilityLevel,
        enabled: sourceSite.enabled,
        notes: sourceSite.notes
      },
      create: {
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
