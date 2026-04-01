import { Suspense } from "react";

import { SearchExperience } from "@/components/search-experience";
import { StatsPanel } from "@/components/stats-panel";
import { STATIC_EVENTS, STATIC_LEADERS, STATIC_REGIONS } from "@/lib/static-data";

export default function HomePage() {
  const byRegion = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const event of STATIC_EVENTS) {
    byRegion.set(event.region.name, (byRegion.get(event.region.name) ?? 0) + 1);
    byType.set(event.eventType, (byType.get(event.eventType) ?? 0) + 1);
  }

  const stats = {
    total: STATIC_EVENTS.length,
    byRegion: Array.from(byRegion.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
    byType: Array.from(byType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count)
  };

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
      <Suspense fallback={<div className="rounded-3xl border border-line bg-white/90 p-6 shadow-soft text-sm text-slate-500">正在加载查询界面…</div>}>
        <SearchExperience events={STATIC_EVENTS} regions={STATIC_REGIONS} leaders={STATIC_LEADERS} />
      </Suspense>
    </main>
  );
}
