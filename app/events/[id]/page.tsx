import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/badge";
import { STATIC_EVENTS } from "@/lib/static-data";
import { credibilityLabels, eventTypeLabels, roleTypeLabels } from "@/lib/utils/labels";
import { parseJsonArray } from "@/lib/utils/json";

export function generateStaticParams() {
  return STATIC_EVENTS.map((event) => ({ id: event.id }));
}

export default async function EventDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = STATIC_EVENTS.find((item) => item.id === id);

  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="rounded-[2rem] border border-line bg-white/90 p-6 shadow-soft">
        <Link href="/" className="text-sm text-slate-500 underline-offset-4 hover:underline">
          返回查询页
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-ink">{event.normalizedTitle}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="green">{eventTypeLabels[event.eventType as keyof typeof eventTypeLabels]}</Badge>
          <Badge tone="ink">{event.region.name}</Badge>
          <Badge>{event.eventDate.slice(0, 10)}</Badge>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <section>
              <h2 className="text-sm font-medium text-slate-500">摘要</h2>
              <p className="mt-2 text-base leading-8 text-slate-700">{event.summary ?? "暂无摘要"}</p>
            </section>
            <section>
              <h2 className="text-sm font-medium text-slate-500">涉及领导</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {event.leaders.map((item) => (
                  <Badge key={item.id} tone="amber">
                    {item.leader.name} / {roleTypeLabels[item.leader.roleType as keyof typeof roleTypeLabels]}
                  </Badge>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-medium text-slate-500">关键词</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {parseJsonArray(event.keywordsJson).map((keyword) => (
                  <Badge key={keyword}>{keyword}</Badge>
                ))}
              </div>
            </section>
          </div>

          <div className="rounded-3xl bg-mist p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">地区</dt>
                <dd>{event.region.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">地点</dt>
                <dd>{event.locationText ?? "未抽取"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">类型</dt>
                <dd>{eventTypeLabels[event.eventType as keyof typeof eventTypeLabels]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">来源数</dt>
                <dd>{event.sources.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">置信度</dt>
                <dd>{event.confidenceScore.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-[2rem] border border-line bg-white/90 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">原始来源</h2>
        <div className="mt-4 space-y-4">
          {event.sources.map((source) => (
            <div key={source.id} className="rounded-3xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {source.isPrimary ? <Badge tone="green">Primary</Badge> : null}
                <Badge tone="amber">{credibilityLabels[(source.rawArticle.credibilityLevel ?? "D") as keyof typeof credibilityLabels]}</Badge>
                <span className="text-sm text-slate-500">
                  {source.rawArticle.sourceSite?.siteName ?? source.rawArticle.sourceName ?? "未知来源"}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-medium text-ink">{source.rawArticle.title}</h3>
              <p className="mt-2 text-sm text-slate-500">
                发布时间：{source.rawArticle.publishTime ? source.rawArticle.publishTime.slice(0, 10) : "未识别"}
              </p>
              <a href={source.rawArticle.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-pine underline-offset-4 hover:underline">
                打开原始链接
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
