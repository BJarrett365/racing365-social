import { NextResponse } from "next/server";
import { mapEditingProjectToLiveHandoff } from "@/features/editing-studio/services/editing-studio-live-handoff";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import type { LiveHandoffIntent } from "@/features/live-control/types/live-session";

const repo = getEditingStudioRepository();

function parseIntent(raw: string | null): LiveHandoffIntent {
  if (raw === "send_live") return "send_live";
  return "create";
}

/**
 * Read-only handoff payload for Live Control (prefill new session from Editing Studio project).
 * Same visibility as GET /api/editing-studio/projects/:id — no extra auth layer.
 */
export async function GET(request: Request, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const intent = parseIntent(searchParams.get("intent"));

    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const handoff = mapEditingProjectToLiveHandoff(project, intent);
    return NextResponse.json({ handoff });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Handoff failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
