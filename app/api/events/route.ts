import { CredibilityLevel, EventType, LeaderRoleType } from "@prisma/client";
import { NextResponse } from "next/server";

import { listEvents } from "@/lib/db/events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const events = await listEvents({
    date: searchParams.get("date") ?? undefined,
    regionCode: searchParams.get("regionCode") ?? undefined,
    leaderName: searchParams.get("leaderName") ?? undefined,
    roleType: (searchParams.get("roleType") as LeaderRoleType | null) ?? undefined,
    eventType: (searchParams.get("eventType") as EventType | null) ?? undefined,
    sourceLevel: (searchParams.get("sourceLevel") as CredibilityLevel | null) ?? undefined
  });

  return NextResponse.json(events);
}
