import { NextResponse } from "next/server";

import { getEventDetail } from "@/lib/db/events";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await getEventDetail(id);

  if (!event) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}
