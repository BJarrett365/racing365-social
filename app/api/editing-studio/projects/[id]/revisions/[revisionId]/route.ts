import { NextResponse } from "next/server";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";

const repo = getEditingStudioRepository();

/** Full revision including snapshot (for compare / rollback confirmation). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; revisionId: string }> }) {
  try {
    const { id, revisionId } = await ctx.params;
    const project = await repo.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const revision = await repo.getProjectRevision(revisionId);
    if (!revision || revision.projectId !== id) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }
    return NextResponse.json({ revision });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Get failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
