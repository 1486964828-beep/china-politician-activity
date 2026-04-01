import type { SearchProvider } from "./providers/base";
import { MockSearchProvider } from "./providers/mock";

export function getSearchProvider(providerName = "mock"): SearchProvider {
  if (providerName === "mock") {
    return new MockSearchProvider();
  }

  throw new Error(`Unsupported search provider: ${providerName}`);
}
