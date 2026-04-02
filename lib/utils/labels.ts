import { CredibilityLevel, EventType, LeaderRoleType, RegionType } from "@prisma/client";

export const eventTypeLabels: Record<EventType, string> = {
  MEETING: "会议",
  RESEARCH: "调研",
  MEETING_WITH: "会见",
  ATTENDANCE: "出席活动",
  SPEECH: "讲话/批示",
  INSPECTION: "督导/检查",
  LIANGHUI: "两会相关",
  ECONOMIC_WORK: "经济工作",
  SAFETY_PRODUCTION: "安全生产",
  PARTY_BUILDING: "党建/组织",
  FOREIGN_AFFAIRS: "外事/港澳台",
  OTHER: "其他"
};

export const credibilityLabels: Record<CredibilityLevel, string> = {
  A: "A 级",
  B: "B 级",
  C: "C 级",
  D: "D 级"
};

export const roleTypeLabels: Record<LeaderRoleType, string> = {
  PARTY_SECRETARY: "党委书记",
  GOVERNOR: "省长",
  CHAIRMAN: "主席",
  MAYOR: "市长"
};

export const regionTypeLabels: Record<RegionType, string> = {
  PROVINCE: "省",
  AUTONOMOUS_REGION: "自治区",
  MUNICIPALITY: "直辖市",
  CITY: "地级市"
};
