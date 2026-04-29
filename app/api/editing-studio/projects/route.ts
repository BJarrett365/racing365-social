import { NextResponse } from "next/server";
import { getEditingRevisionActorFromRequest } from "@/features/editing-studio/lib/editing-revision-actor";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";

const repo = getEditingStudioRepository();

/**
 * Editing Studio — isolated API. List / create projects (local JSON store).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived =
      searchParams.get("includeArchived") === "true" || searchParams.get("includeArchived") === "1";
    const projects = await repo.listProjects({ includeArchived });
    return NextResponse.json({ projects });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as unknown;
    const actor = getEditingRevisionActorFromRequest(req);
    const project = await repo.createProject(body, { actor });
    return NextResponse.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
