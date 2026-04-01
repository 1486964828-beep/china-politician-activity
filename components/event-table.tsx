import Link from "next/link";

import { Badge } from "@/components/badge";
import type { EventListItem } from "@/lib/db/events";
import { credibilityLabels, eventTypeLabels, roleTypeLabels } from "@/lib/utils/labels";

export function EventTable({ events }: { events: EventListItem[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-white/80 p-8 text-center text-sm text-slate-500">
        当前筛选条件下暂无事件，可先运行 `npm run pipeline -- --month=2026-03` 生成样例数据。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white/95 shadow-soft">
      <table className="min-w-full">
        <thead className="bg-clay text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">日期</th>
            <th className="px-4 py-3">地区</th>
            <th className="px-4 py-3">领导</th>
            <th className="px-4 py-3">标准标题</th>
            <th className="px-4 py-3">类型</th>
            <th className="px-4 py-3">来源</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const primary = event.sources.find((item) => item.isPrimary) ?? event.sources[0];
            return (
              <tr key={event.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4 text-sm text-slate-600">{event.eventDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-4 text-sm">
                  <div className="font-medium text-ink">{event.region.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{event.locationText ?? "未抽取地点"}</div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  <div className="space-y-1">
                    {event.leaders.map((item) => (
                      <div key={item.id}>
                        <span className="font-medium">{item.leader.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{roleTypeLabels[item.leader.roleType]}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm">
                  <Link href={`/events/${event.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {event.normalizedTitle}
                  </Link>
                  <p className="mt-2 max-w-xl text-slate-600">{event.summary}</p>
                </td>
                <td className="px-4 py-4 text-sm">
                  <Badge tone="green">{eventTypeLabels[event.eventType]}</Badge>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  <div>来源数：{event.sources.length}</div>
                  {primary ? (
                    <div className="mt-2 space-y-1">
                      <Badge tone="amber">{credibilityLabels[primary.rawArticle.credibilityLevel ?? "D"]}</Badge>
                      <a href={primary.rawArticle.url} target="_blank" rel="noreferrer" className="block text-xs text-slate-500 underline-offset-4 hover:underline">
                        {primary.rawArticle.title}
                      </a>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
