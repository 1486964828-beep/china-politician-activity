import { CredibilityLevel, EventType, LeaderRoleType } from "@prisma/client";

import { EventTable } from "@/components/event-table";
import { SearchPanel } from "@/components/search-panel";
import { StatsPanel } from "@/components/stats-panel";
import { getFilterOptions, getStats, listEvents } from "@/lib/db/events";

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters = {
    date: pickString(params.date),
    regionCode: pickString(params.regionCode),
    leaderName: pickString(params.leaderName),
    roleType: pickString(params.roleType) as LeaderRoleType | "",
    eventType: pickString(params.eventType) as EventType | "",
    sourceLevel: pickString(params.sourceLevel) as CredibilityLevel | ""
  };

  const [{ regions, leaders }, stats, events] = await Promise.all([
    getFilterOptions(),
    getStats("2026-03"),
    listEvents(filters)
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="rounded-[2rem] border border-line bg-white/80 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-pine">Province Activity Database</p>
            <h1 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">省级党政主官活动数据库</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
              面向 2026 年 3 月 31 个省级行政区的“领导活动事件数据库”MVP。当前已打通检索召回、来源校验、正文抽取、事件生成、去重归并与前端检索展示全链路。
            </p>
          </div>
          <div className="rounded-3xl bg-clay px-4 py-3 text-sm text-slate-600">
            演示样例当前覆盖北京、广东、浙江、湖北、四川的真实风格数据链路
          </div>
        </div>
      </section>

      <StatsPanel total={stats.total} byRegion={stats.byRegion} byType={stats.byType} />
      <SearchPanel regions={regions} leaders={leaders} filters={filters} />
      <EventTable events={events} />
    </main>
  );
}
