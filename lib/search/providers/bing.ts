import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { load } from "cheerio";

import type { SearchProvider, SearchResult, SearchTaskContext } from "./base";

const execFileAsync = promisify(execFile);
const BING_BASE = "https://www.bing.com/search";

async function fetchTextByPwsh(url: string) {
  const command = `$ProgressPreference='SilentlyContinue'; $r = Invoke-WebRequest -UseBasicParsing -Headers @{'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'} -Uri '${url.replace(/'/g, "''")}'; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $r.Content`;
  const { stdout } = await execFileAsync("pwsh", ["-NoProfile", "-Command", command], {
    maxBuffer: 8 * 1024 * 1024
  });
  return stdout;
}

export class BingSearchProvider implements SearchProvider {
  readonly name = "bing";

  async search(context: SearchTaskContext): Promise<SearchResult[]> {
    const url = new URL(BING_BASE);
    url.searchParams.set("format", "rss");
    url.searchParams.set("q", context.queryText);

    const xml = await fetchTextByPwsh(url.toString());
    const $ = load(xml, { xmlMode: true });
    const results: SearchResult[] = [];

    $("item").each((index, node) => {
      const title = $(node).find("title").first().text().trim();
      const link = $(node).find("link").first().text().trim();
      const snippet = $(node).find("description").first().text().trim();

      if (!link) {
        return;
      }

      try {
        const parsed = new URL(link);
        results.push({
          url: link,
          title,
          snippet,
          domain: parsed.hostname.replace(/^www\./, ""),
          rank: index + 1
        });
      } catch {
        // Ignore malformed result URLs.
      }
    });

    return results;
  }
}
