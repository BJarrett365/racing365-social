import { NextResponse } from "next/server";
import { ProjectStorageService } from "@/lib/podcast-template/project-storage-service";
import type { PodcastProject } from "@/types/podcast-template";

const storage = new ProjectStorageService();

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await storage.get(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as PodcastProject;
    if (!body?.id || body.id !== id) {
      return NextResponse.json({ error: "Project id mismatch" }, { status: 400 });
    }
    const saved = await storage.upsert(body);
    return NextResponse.json({ project: saved });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
