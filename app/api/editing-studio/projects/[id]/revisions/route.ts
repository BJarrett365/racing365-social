import { NextResponse } from "next/server";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";

const repo = getEditingStudioRepository();

/** List revision summaries (no embedded snapshots) for a project. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await repo.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const revisions = await repo.listProjectRevisionSummaries(id);
    return NextResponse.json({ revisions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
