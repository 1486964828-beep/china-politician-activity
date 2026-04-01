import type { SearchProvider } from "./providers/base";
import { BingSearchProvider } from "./providers/bing";
import { MockSearchProvider } from "./providers/mock";

export function getSearchProvider(providerName = "mock"): SearchProvider {
  if (providerName === "mock") {
    return new MockSearchProvider();
  }

  if (providerName === "bing") {
    return new BingSearchProvider();
  }

  throw new Error(`Unsupported search provider: ${providerName}`);
}
