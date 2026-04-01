import { prisma } from "../lib/prisma";
import { fetchArticleByUrl } from "../lib/pipeline/article-fetcher";
import { matchSourceForRegion } from "../lib/pipeline/source-matcher";
import { sha1 } from "../lib/utils/hash";

async function main() {
  const candidates = await prisma.candidateUrl.findMany({
    where: {
      fetchStatus: "PENDING",
      isOfficialCandidate: true
    },
    include: {
      searchTask: true
    },
    orderBy: { discoveredAt: "asc" }
  });

  let fetched = 0;

  for (const candidate of candidates) {
    try {
      const existing = await prisma.rawArticle.findUnique({
        where: { url: candidate.url }
      });

      if (!existing) {
        const article = await fetchArticleByUrl(candidate.url);
        const match = await matchSourceForRegion({
          regionId: candidate.searchTask.regionId,
          domain: article.sourceDomain ?? candidate.domain,
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
            sourceDomain: article.sourceDomain ?? candidate.domain,
            credibilityLevel: match.credibilityLevel,
            checksum: sha1(article.rawText),
            articleStatus: match.credibilityLevel === "D" ? "IGNORED" : "RAW"
          }
        });
      }

      await prisma.candidateUrl.update({
        where: { id: candidate.id },
        data: { fetchStatus: "FETCHED" }
      });

      fetched += 1;
    } catch (error) {
      await prisma.candidateUrl.update({
        where: { id: candidate.id },
        data: { fetchStatus: "FAILED" }
      });
      console.error(`Failed to fetch ${candidate.url}`, error);
    }
  }

  console.log(`Fetched ${fetched} candidate articles.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
