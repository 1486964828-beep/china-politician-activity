import { CredibilityLevel, EventType, LeaderRoleType, Prisma } from "@prisma/client";

import { prisma } from "../prisma";
import { getMonthBounds } from "../utils/dates";

export type EventFilters = {
  date?: string;
  regionCode?: string;
  leaderName?: string;
  roleType?: LeaderRoleType | "";
  eventType?: EventType | "";
  sourceLevel?: CredibilityLevel | "";
};

export type EventListItem = Awaited<ReturnType<typeof listEvents>>[number];
export type EventDetailItem = Awaited<ReturnType<typeof getEventDetail>>;

function buildWhere(filters: EventFilters): Prisma.EventWhereInput {
  const and: Prisma.EventWhereInput[] = [];

  if (filters.date) {
    const start = new Date(`${filters.date}T00:00:00.000Z`);
    const end = new Date(`${filters.date}T23:59:59.999Z`);
    and.push({
      eventDate: {
        gte: start,
        lte: end
      }
    });
  }

  if (filters.regionCode) {
    and.push({
      region: {
        code: filters.regionCode
      }
    });
  }

  if (filters.leaderName) {
    and.push({
      leaders: {
        some: {
          leader: {
            name: {
              contains: filters.leaderName
            }
          }
        }
      }
    });
  }

  if (filters.roleType) {
    and.push({
      leaders: {
        some: {
          leader: {
            roleType: filters.roleType
          }
        }
      }
    });
  }

  if (filters.eventType) {
    and.push({ eventType: filters.eventType });
  }

  if (filters.sourceLevel) {
    and.push({
      sources: {
        some: {
          rawArticle: {
            credibilityLevel: filters.sourceLevel
          }
        }
      }
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export async function listEvents(filters: EventFilters) {
  return prisma.event.findMany({
    where: buildWhere(filters),
    include: {
      region: true,
      leaders: {
        include: {
          leader: true
        }
      },
      sources: {
        include: {
          rawArticle: {
            include: {
              sourceSite: true
            }
          }
        }
      }
    },
    orderBy: [{ eventDate: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getEventDetail(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      region: true,
      leaders: {
        include: {
          leader: true
        }
      },
      sources: {
        include: {
          rawArticle: {
            include: {
              sourceSite: true
            }
          }
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
      }
    }
  });
}

export async function getFilterOptions() {
  const [regions, leaders] = await Promise.all([
    prisma.region.findMany({ orderBy: { code: "asc" } }),
    prisma.leader.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }]
    })
  ]);

  return { regions, leaders };
}

export async function getStats(month = "2026-03") {
  const { start, end } = getMonthBounds(month);
  const events = await prisma.event.findMany({
    where: {
      eventDate: {
        gte: start,
        lt: end
      }
    },
    include: {
      region: true
    }
  });

  const byRegion = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const event of events) {
    byRegion.set(event.region.name, (byRegion.get(event.region.name) ?? 0) + 1);
    byType.set(event.eventType, (byType.get(event.eventType) ?? 0) + 1);
  }

  return {
    total: events.length,
    byRegion: Array.from(byRegion.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
    byType: Array.from(byType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count)
  };
}
