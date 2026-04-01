import events from "@/data/generated/events.json";
import { LEADER_SEEDS } from "@/data/seeds/leaders";
import { REGION_SEEDS } from "@/data/seeds/regions";

export type StaticEvent = (typeof events)[number];

export const STATIC_EVENTS = events as StaticEvent[];
export const STATIC_REGIONS = REGION_SEEDS.map((item) => ({
  code: item.code,
  name: item.name
}));
export const STATIC_LEADERS = LEADER_SEEDS.map((item) => ({
  name: item.name
}));
