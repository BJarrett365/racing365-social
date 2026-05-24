import { NextResponse } from "next/server";
import { editorialCalendarCreateSchema } from "@/app/lib/editorial-calendar/schemas";
import { listEditorialCalendarEvents, createEditorialCalendarEvent } from "@/app/lib/editorial-calendar/store";
import type { EditorialCalendarListFilters } from "@/app/lib/editorial-calendar/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters: EditorialCalendarListFilters = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      sport: (searchParams.get("sport") as EditorialCalendarListFilters["sport"]) ?? "all",
      brand: searchParams.get("brand") ?? undefined,
      competition: searchParams.get("competition") ?? undefined,
      type: (searchParams.get("type") as EditorialCalendarListFilters["type"]) ?? "all",
    };
    const events = await listEditorialCalendarEvents(filters);
    return NextResponse.json({ events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = editorialCalendarCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const event = await createEditorialCalendarEvent(parsed.data);
    return NextResponse.json({ event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
