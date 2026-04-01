"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EventTable } from "@/components/event-table";
import type { StaticEvent } from "@/lib/static-data";

export function SearchExperience({
  events,
  regions,
  leaders
}: {
  events: StaticEvent[];
  regions: Array<{ code: string; name: string }>;
  leaders: Array<{ name: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [date, setDate] = useState(searchParams.get("date") ?? "");
  const [regionCode, setRegionCode] = useState(searchParams.get("regionCode") ?? "");
  const [leaderName, setLeaderName] = useState(searchParams.get("leaderName") ?? "");
  const [roleType, setRoleType] = useState(searchParams.get("roleType") ?? "");
  const [eventType, setEventType] = useState(searchParams.get("eventType") ?? "");
  const [sourceLevel, setSourceLevel] = useState(searchParams.get("sourceLevel") ?? "");

  const filteredEvents = events.filter((event) => {
    if (date && event.eventDate.slice(0, 10) !== date) {
      return false;
    }

    if (regionCode && event.region.code !== regionCode) {
      return false;
    }

    if (leaderName && !event.leaders.some((item) => item.leader.name.includes(leaderName))) {
      return false;
    }

    if (roleType && !event.leaders.some((item) => item.leader.roleType === roleType)) {
      return false;
    }

    if (eventType && event.eventType !== eventType) {
      return false;
    }

    if (sourceLevel && !event.sources.some((item) => item.rawArticle.credibilityLevel === sourceLevel)) {
      return false;
    }

    return true;
  });

  const submit = () => {
    let query = new URLSearchParams();

    if (date) query.set("date", date);
    if (regionCode) query.set("regionCode", regionCode);
    if (leaderName) query.set("leaderName", leaderName);
    if (roleType) query.set("roleType", roleType);
    if (eventType) query.set("eventType", eventType);
    if (sourceLevel) query.set("sourceLevel", sourceLevel);

    router.replace(`${pathname}${query.toString() ? `?${query.toString()}` : ""}`, { scroll: false });
  };

  const reset = () => {
    setDate("");
    setRegionCode("");
    setLeaderName("");
    setRoleType("");
    setEventType("");
    setSourceLevel("");
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-3xl border border-line bg-white/90 p-5 shadow-soft md:grid-cols-6">
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm" />
        <select value={regionCode} onChange={(event) => setRegionCode(event.target.value)} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
          <option value="">全部省份</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          list="leader-list"
          value={leaderName}
          onChange={(event) => setLeaderName(event.target.value)}
          placeholder="领导姓名"
          className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm"
        />
        <datalist id="leader-list">
          {leaders.map((leader) => (
            <option key={leader.name} value={leader.name} />
          ))}
        </datalist>
        <select value={roleType} onChange={(event) => setRoleType(event.target.value)} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
          <option value="">全部职务</option>
          <option value="PARTY_SECRETARY">党委书记</option>
          <option value="GOVERNOR">省长</option>
          <option value="CHAIRMAN">自治区主席</option>
          <option value="MAYOR">市长</option>
        </select>
        <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
          <option value="">全部活动类型</option>
          <option value="MEETING">会议</option>
          <option value="RESEARCH">调研</option>
          <option value="MEETING_WITH">会见</option>
          <option value="ATTENDANCE">出席活动</option>
          <option value="SPEECH">讲话/批示</option>
          <option value="INSPECTION">督导/检查</option>
          <option value="LIANGHUI">两会相关</option>
          <option value="ECONOMIC_WORK">经济工作</option>
          <option value="SAFETY_PRODUCTION">安全生产</option>
          <option value="PARTY_BUILDING">党建/组织</option>
          <option value="FOREIGN_AFFAIRS">外事/港澳台</option>
          <option value="OTHER">其他</option>
        </select>
        <div className="flex gap-2">
          <select value={sourceLevel} onChange={(event) => setSourceLevel(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
            <option value="">全部来源级别</option>
            <option value="A">A 级</option>
            <option value="B">B 级</option>
            <option value="C">C 级</option>
          </select>
          <button type="button" onClick={submit} className="rounded-2xl bg-pine px-4 py-2 text-sm font-medium text-white">
            查询
          </button>
          <button type="button" onClick={reset} className="rounded-2xl border border-line px-4 py-2 text-sm font-medium text-slate-600">
            重置
          </button>
        </div>
      </div>

      <EventTable events={filteredEvents} />
    </div>
  );
}
