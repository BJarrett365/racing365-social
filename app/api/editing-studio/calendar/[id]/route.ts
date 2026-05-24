import { NextResponse } from "next/server";
import { editorialCalendarPatchSchema } from "@/app/lib/editorial-calendar/schemas";
import {
  deleteEditorialCalendarEvent,
  getEditorialCalendarEvent,
  patchEditorialCalendarEvent,
} from "@/app/lib/editorial-calendar/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const event = await getEditorialCalendarEvent(id);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Get failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = editorialCalendarPatchSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const event = await patchEditorialCalendarEvent(id, parsed.data);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const ok = await deleteEditorialCalendarEvent(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Cannot delete fixture events or event not found" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
