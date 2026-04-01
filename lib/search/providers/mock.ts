import { MOCK_ARTICLE_FIXTURES } from "../../../data/mock/fixtures";
import type { SearchProvider, SearchResult, SearchTaskContext } from "./base";
import { formatIsoDate } from "../../utils/dates";

export class MockSearchProvider implements SearchProvider {
  readonly name = "mock";

  async search(context: SearchTaskContext): Promise<SearchResult[]> {
    const dateKey = formatIsoDate(context.searchDate);
    const leaderName = context.leader?.name;

    return MOCK_ARTICLE_FIXTURES.filter((fixture) => {
      if (fixture.regionCode !== context.region.code) {
        return false;
      }

      if (fixture.eventDate !== dateKey) {
        return false;
      }

      if (leaderName && !fixture.leaderNames.includes(leaderName)) {
        return false;
      }

      return true;
    }).map<SearchResult>((fixture, index) => ({
      url: fixture.url,
      title: fixture.title,
      snippet: fixture.snippet,
      domain: fixture.domain,
      rank: index + 1
    }));
  }
}
