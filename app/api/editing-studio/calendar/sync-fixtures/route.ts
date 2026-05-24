import { NextResponse } from "next/server";
import { syncFixturesToEditorialCalendar } from "@/app/lib/editorial-calendar/sync-fixtures";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncFixturesToEditorialCalendar();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
