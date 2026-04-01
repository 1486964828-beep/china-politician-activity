import { prisma } from "../lib/prisma";
import { runDeduplication } from "../lib/pipeline/dedup";

async function main() {
  const result = await runDeduplication();
  console.log(`Merged ${result.mergedCount} duplicate events.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
