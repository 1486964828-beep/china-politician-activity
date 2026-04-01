import { eventTypeLabels } from "@/lib/utils/labels";

export function StatsPanel({
  total,
  byRegion,
  byType
}: {
  total: number;
  byRegion: Array<{ name: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr]">
      <div className="rounded-3xl border border-line bg-white/90 p-5 shadow-soft">
        <p className="text-sm text-slate-500">本月事件总量</p>
        <p className="mt-3 text-4xl font-semibold text-ink">{total}</p>
        <p className="mt-2 text-sm text-slate-600">统计窗口默认展示 2026 年 3 月。</p>
      </div>
      <div className="rounded-3xl border border-line bg-white/90 p-5 shadow-soft">
        <p className="text-sm font-medium text-ink">各省收录数量</p>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {byRegion.slice(0, 6).map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <span>{item.name}</span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-white/90 p-5 shadow-soft">
        <p className="text-sm font-medium text-ink">各类型活动数量</p>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {byType.slice(0, 6).map((item) => (
            <div key={item.type} className="flex items-center justify-between">
              <span>{eventTypeLabels[item.type as keyof typeof eventTypeLabels] ?? item.type}</span>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
