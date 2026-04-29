import { NextResponse } from "next/server";
import { getEditingRevisionActorFromRequest } from "@/features/editing-studio/lib/editing-revision-actor";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import { editingProjectPutBodySchema } from "@/features/editing-studio/validators/editing-studio-schemas";

const repo = getEditingStudioRepository();

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await repo.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Get failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = editingProjectPutBodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { revisionNote, ...patch } = parsed.data;
    const actor = getEditingRevisionActorFromRequest(req);
    const project = await repo.updateProject(id, patch, { actor, note: revisionNote });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Default: soft archive. Use `?permanent=1` to remove from store (dev / admin).
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true" || searchParams.get("permanent") === "1";

    if (permanent) {
      const ok = await repo.deleteProjectPermanent(id);
      if (!ok) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, mode: "permanent" });
    }

    const project = await repo.archiveProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project, mode: "archived" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
