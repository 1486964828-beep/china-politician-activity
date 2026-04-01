import type { CredibilityLevel, SourceSite, SourceType } from "@prisma/client";

import { prisma } from "../prisma";

export type SourceMatchResult = {
  sourceSiteId?: string;
  sourceType: SourceType;
  credibilityLevel: CredibilityLevel;
  confidence: number;
  isOfficialCandidate: boolean;
  matchedSiteName?: string;
};

function domainMatches(candidateDomain: string, baseDomain: string) {
  return candidateDomain === baseDomain || candidateDomain.endsWith(`.${baseDomain}`);
}

function classifyCentralMedia(domain: string, title?: string, snippet?: string): SourceMatchResult | null {
  const hint = `${title ?? ""} ${snippet ?? ""}`;

  if (/people\.com\.cn$/.test(domain) || domain.includes("people.com.cn")) {
    return {
      sourceType: "CENTRAL_MEDIA",
      credibilityLevel: "C",
      confidence: 0.8,
      isOfficialCandidate: true,
      matchedSiteName: "人民网地方频道"
    };
  }

  if (/news\.cn$/.test(domain) || domain.includes("xinhuanet.com") || hint.includes("新华网")) {
    return {
      sourceType: "CENTRAL_MEDIA",
      credibilityLevel: "C",
      confidence: 0.78,
      isOfficialCandidate: true,
      matchedSiteName: "新华网地方频道"
    };
  }

  return null;
}

export async function matchSourceForRegion(input: {
  regionId: string;
  domain: string;
  title?: string | null;
  snippet?: string | null;
}) {
  const sites = await prisma.sourceSite.findMany({
    where: {
      regionId: input.regionId,
      enabled: true
    }
  });

  const exactMatch = sites.find((site) => domainMatches(input.domain, site.baseDomain));

  if (exactMatch) {
    return {
      sourceSiteId: exactMatch.id,
      sourceType: exactMatch.sourceType,
      credibilityLevel: exactMatch.credibilityLevel,
      confidence: exactMatch.credibilityLevel === "A" ? 0.98 : 0.9,
      isOfficialCandidate: exactMatch.credibilityLevel !== "D",
      matchedSiteName: exactMatch.siteName
    } satisfies SourceMatchResult;
  }

  const central = classifyCentralMedia(input.domain, input.title ?? undefined, input.snippet ?? undefined);

  if (central) {
    return central;
  }

  return {
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "D",
    confidence: 0.2,
    isOfficialCandidate: false
  } satisfies SourceMatchResult;
}

export function rankSourceSite(site: Pick<SourceSite, "credibilityLevel"> | null | undefined) {
  if (!site) {
    return 0.5;
  }

  return {
    A: 1,
    B: 0.85,
    C: 0.7,
    D: 0.2
  }[site.credibilityLevel];
}
