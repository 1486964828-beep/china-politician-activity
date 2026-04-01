import { NextResponse } from "next/server";

import { getStats } from "@/lib/db/events";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "2026-03";
  const stats = await getStats(month);
  return NextResponse.json(stats);
}
