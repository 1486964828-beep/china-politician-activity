import { prisma } from "../lib/prisma";
import { getArgValue } from "../lib/utils/args";
import { enumerateMonthDays, getMonthBounds, toChinaDate } from "../lib/utils/dates";

function buildQueries(input: {
  regionName: string;
  leaderName: string;
  officialTitle: string;
  searchDate: Date;
}) {
  const dateLabel = toChinaDate(input.searchDate);

  return [
    `${dateLabel} ${input.regionName} ${input.leaderName} ${input.officialTitle} 活动`,
    `${input.regionName} ${input.leaderName} 调研 会见 会议 出席 ${dateLabel}`
  ];
}

async function main() {
  const month = getArgValue("--month", "2026-03")!;
  const engine = getArgValue("--engine", "mock")!;
  const { start, end } = getMonthBounds(month);
  const regions = await prisma.region.findMany({
    include: {
      leaders: {
        where: { active: true }
      }
    },
    orderBy: { code: "asc" }
  });

  await prisma.searchTask.deleteMany({
    where: {
      searchDate: {
        gte: start,
        lt: end
      }
    }
  });

  const payload: Array<{
    regionId: string;
    searchDate: Date;
    leaderId: string;
    queryText: string;
    engine: string;
    status: "PENDING";
  }> = [];

  for (const date of enumerateMonthDays(month)) {
    for (const region of regions) {
      for (const leader of region.leaders) {
        const queries = buildQueries({
          regionName: region.name,
          leaderName: leader.name,
          officialTitle: leader.officialTitle,
          searchDate: date
        });

        payload.push(
          ...queries.map((queryText) => ({
            regionId: region.id,
            searchDate: date,
            leaderId: leader.id,
            queryText,
            engine,
            status: "PENDING" as const
          }))
        );
      }
    }
  }

  for (let offset = 0; offset < payload.length; offset += 500) {
    await prisma.searchTask.createMany({
      data: payload.slice(offset, offset + 500)
    });
  }

  console.log(`Generated ${payload.length} search tasks for ${month}.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
