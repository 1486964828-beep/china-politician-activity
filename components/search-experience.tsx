"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EventTable } from "@/components/event-table";
import type { StaticEvent } from "@/lib/static-data";

type RegionOption = {
  code: string;
  name: string;
  level: "PROVINCE" | "CITY";
  type: string;
  parentCode: string | null;
};

type LeaderOption = {
  name: string;
  regionCode: string;
  roleType: string;
  officialTitle: string;
};

type LeaderValue = `${string}::${string}::${string}`;

function toLeaderValue(leader: LeaderOption) {
  return `${leader.name}::${leader.regionCode}::${leader.roleType}` satisfies LeaderValue;
}

function cleanParam(value: string) {
  return value.trim();
}

export function SearchExperience({
  events,
  regions,
  leaders
}: {
  events: StaticEvent[];
  regions: RegionOption[];
  leaders: LeaderOption[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [date, setDate] = useState(searchParams.get("date") ?? "");
  const [provinceCode, setProvinceCode] = useState(searchParams.get("provinceCode") ?? searchParams.get("regionCode") ?? "");
  const [cityCode, setCityCode] = useState(searchParams.get("cityCode") ?? "");
  const [leaderValue, setLeaderValue] = useState(searchParams.get("leader") ?? "");
  const [leaderName, setLeaderName] = useState(searchParams.get("leaderName") ?? "");
  const [roleType, setRoleType] = useState(searchParams.get("roleType") ?? "");
  const [eventType, setEventType] = useState(searchParams.get("eventType") ?? "");
  const [sourceLevel, setSourceLevel] = useState(searchParams.get("sourceLevel") ?? "");

  const provinces = useMemo(() => regions.filter((region) => region.level === "PROVINCE"), [regions]);
  const cities = useMemo(
    () => regions.filter((region) => region.level === "CITY" && region.parentCode === provinceCode),
    [provinceCode, regions]
  );

  const visibleLeaders = useMemo(() => {
    if (cityCode) {
      return leaders.filter((leader) => leader.regionCode === cityCode);
    }

    if (provinceCode) {
      const cityCodes = new Set(cities.map((city) => city.code));
      return leaders.filter((leader) => leader.regionCode === provinceCode || cityCodes.has(leader.regionCode));
    }

    return leaders;
  }, [cities, cityCode, leaders, provinceCode]);

  const selectedLeader = leaderValue
    ? visibleLeaders.find((leader) => toLeaderValue(leader) === leaderValue) ??
      leaders.find((leader) => toLeaderValue(leader) === leaderValue)
    : null;

  const effectiveLeaderName = selectedLeader?.name ?? cleanParam(leaderName);
  const effectiveRoleType = selectedLeader?.roleType ?? cleanParam(roleType);
  const effectiveRegionCode = cityCode || provinceCode;

  const filteredEvents = events.filter((event) => {
    if (date && event.eventDate.slice(0, 10) !== date) {
      return false;
    }

    if (cityCode && event.region.code !== cityCode) {
      return false;
    }

    if (!cityCode && provinceCode && event.region.code !== provinceCode) {
      return false;
    }

    if (effectiveLeaderName && !event.leaders.some((item) => item.leader.name === effectiveLeaderName)) {
      return false;
    }

    if (effectiveRoleType && !event.leaders.some((item) => item.leader.roleType === effectiveRoleType)) {
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
    const query = new URLSearchParams();

    if (date) query.set("date", date);
    if (provinceCode) query.set("provinceCode", provinceCode);
    if (cityCode) query.set("cityCode", cityCode);
    if (leaderValue) query.set("leader", leaderValue);
    if (!leaderValue && leaderName) query.set("leaderName", leaderName);
    if (!selectedLeader && roleType) query.set("roleType", roleType);
    if (eventType) query.set("eventType", eventType);
    if (sourceLevel) query.set("sourceLevel", sourceLevel);

    router.replace(`${pathname}${query.toString() ? `?${query.toString()}` : ""}`, { scroll: false });
  };

  const reset = () => {
    setDate("");
    setProvinceCode("");
    setCityCode("");
    setLeaderValue("");
    setLeaderName("");
    setRoleType("");
    setEventType("");
    setSourceLevel("");
    router.replace(pathname, { scroll: false });
  };

  const onProvinceChange = (value: string) => {
    setProvinceCode(value);
    setCityCode("");
    setLeaderValue("");
  };

  const onCityChange = (value: string) => {
    setCityCode(value);
    setLeaderValue("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-3xl border border-line bg-white/90 p-5 shadow-soft md:grid-cols-7">
        <select value={provinceCode} onChange={(event) => onProvinceChange(event.target.value)} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
          <option value="">全部省份</option>
          {provinces.map((province) => (
            <option key={province.code} value={province.code}>
              {province.name}
            </option>
          ))}
        </select>

        <select
          value={cityCode}
          onChange={(event) => onCityChange(event.target.value)}
          disabled={!provinceCode || cities.length === 0}
          className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">{provinceCode ? "全部市级样本" : "先选省份"}</option>
          {cities.map((city) => (
            <option key={city.code} value={city.code}>
              {city.name}
            </option>
          ))}
        </select>

        <select
          value={leaderValue}
          onChange={(event) => {
            setLeaderValue(event.target.value);
            setLeaderName("");
            if (event.target.value) {
              setRoleType("");
            }
          }}
          className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm"
        >
          <option value="">先确定领导</option>
          {visibleLeaders.map((leader) => (
            <option key={toLeaderValue(leader)} value={toLeaderValue(leader)}>
              {leader.name} / {leader.officialTitle}
            </option>
          ))}
        </select>

        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm" />

        <input
          type="text"
          value={leaderName}
          onChange={(event) => setLeaderName(event.target.value)}
          placeholder="姓名补充检索"
          disabled={Boolean(selectedLeader)}
          className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <select
          value={roleType}
          onChange={(event) => setRoleType(event.target.value)}
          disabled={Boolean(selectedLeader)}
          className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
        >
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

        <div className="md:col-span-7 flex flex-wrap gap-2">
          <select value={sourceLevel} onChange={(event) => setSourceLevel(event.target.value)} className="min-w-[10rem] rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
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
          <div className="ml-auto text-sm text-slate-500">
            当前结果 {filteredEvents.length} 条
            {effectiveRegionCode ? ` / 地区：${regions.find((item) => item.code === effectiveRegionCode)?.name ?? effectiveRegionCode}` : ""}
            {effectiveLeaderName ? ` / 领导：${effectiveLeaderName}` : ""}
          </div>
        </div>
      </div>

      <EventTable events={filteredEvents} />
    </div>
  );
}
