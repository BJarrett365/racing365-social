import { NextResponse } from "next/server";
import { getEditingRevisionActorFromRequest } from "@/features/editing-studio/lib/editing-revision-actor";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import { manualProjectCreateSchema } from "@/features/editing-studio/validators/editing-studio-schemas";
import { linkContentToCalendarPhase } from "@/app/lib/editorial-calendar/store";

const repo = getEditingStudioRepository();

/**
 * Manual Editing Studio project creation (no URL import).
 */
export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = manualProjectCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const d = parsed.data;
    const sourceUrl = d.sourceUrl?.trim() || undefined;

    const actor = getEditingRevisionActorFromRequest(req);
    const project = await repo.createProject(
      {
        title: d.title.trim(),
        publicHeadline: d.publicHeadline.trim(),
        brand: d.brand.trim(),
        contentType: d.contentType,
        summary: d.summary.trim(),
        bodyNotes: d.bodyNotes,
        sourceUrl,
        description: d.summary.trim(),
        status: "draft",
        platforms: [...d.platforms],
        assets: [],
        copyVariants: [],
        calendarEventId: d.calendarEventId,
        calendarPhase: d.calendarPhase,
        integrationMeta: {
          manual: {
            createdAt: new Date().toISOString(),
          },
        },
      },
      { actor },
    );

    if (d.calendarEventId && d.calendarPhase) {
      await linkContentToCalendarPhase({
        eventId: d.calendarEventId,
        phase: d.calendarPhase,
        editingProjectId: project.id,
      }).catch(() => undefined);
    }

    return NextResponse.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
