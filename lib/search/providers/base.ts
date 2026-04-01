import type { Leader, Region } from "@prisma/client";

export type SearchResult = {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  rank: number;
};

export type SearchTaskContext = {
  region: Pick<Region, "id" | "code" | "name">;
  leader?: Pick<Leader, "id" | "name" | "officialTitle" | "normalizedTitle"> | null;
  searchDate: Date;
  queryText: string;
};

export interface SearchProvider {
  readonly name: string;
  search(context: SearchTaskContext): Promise<SearchResult[]>;
}
