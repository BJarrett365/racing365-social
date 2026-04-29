import { NextResponse } from "next/server";
import { getEditingRevisionActorFromRequest } from "@/features/editing-studio/lib/editing-revision-actor";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import { editingProjectRollbackBodySchema } from "@/features/editing-studio/validators/editing-studio-schemas";

const repo = getEditingStudioRepository();

/** Restore project content from a stored revision snapshot; bumps project.revision and records a rollback revision. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = editingProjectRollbackBodySchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const actor = getEditingRevisionActorFromRequest(req);
    const project = await repo.rollbackProject(id, parsed.data.revisionId, {
      actor,
      note: parsed.data.note,
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rollback failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
