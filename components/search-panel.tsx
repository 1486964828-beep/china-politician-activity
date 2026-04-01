import { EventType, LeaderRoleType } from "@prisma/client";

import { eventTypeLabels } from "@/lib/utils/labels";

type RegionOption = {
  code: string;
  name: string;
};

type LeaderOption = {
  name: string;
};

export function SearchPanel({
  regions,
  leaders,
  filters
}: {
  regions: RegionOption[];
  leaders: LeaderOption[];
  filters: Record<string, string | undefined>;
}) {
  return (
    <form className="grid gap-3 rounded-3xl border border-line bg-white/90 p-5 shadow-soft md:grid-cols-6">
      <input
        type="date"
        name="date"
        defaultValue={filters.date}
        className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm"
      />
      <select name="regionCode" defaultValue={filters.regionCode ?? ""} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
        <option value="">全部省份</option>
        {regions.map((region) => (
          <option key={region.code} value={region.code}>
            {region.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="leaderName"
        list="leader-list"
        defaultValue={filters.leaderName}
        placeholder="领导姓名"
        className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm"
      />
      <datalist id="leader-list">
        {leaders.map((leader) => (
          <option key={leader.name} value={leader.name} />
        ))}
      </datalist>
      <select name="roleType" defaultValue={filters.roleType ?? ""} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
        <option value="">全部职务</option>
        <option value={LeaderRoleType.PARTY_SECRETARY}>党委书记</option>
        <option value={LeaderRoleType.GOVERNOR}>省长</option>
        <option value={LeaderRoleType.CHAIRMAN}>自治区主席</option>
        <option value={LeaderRoleType.MAYOR}>市长</option>
      </select>
      <select name="eventType" defaultValue={filters.eventType ?? ""} className="rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
        <option value="">全部活动类型</option>
        {Object.values(EventType).map((value) => (
          <option key={value} value={value}>
            {eventTypeLabels[value]}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <select name="sourceLevel" defaultValue={filters.sourceLevel ?? ""} className="min-w-0 flex-1 rounded-2xl border border-line bg-mist px-3 py-2 text-sm">
          <option value="">全部来源级别</option>
          <option value="A">A 级</option>
          <option value="B">B 级</option>
          <option value="C">C 级</option>
        </select>
        <button type="submit" className="rounded-2xl bg-pine px-4 py-2 text-sm font-medium text-white">
          查询
        </button>
      </div>
    </form>
  );
}
