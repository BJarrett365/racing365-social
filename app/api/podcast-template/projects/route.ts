import { NextResponse } from "next/server";
import { ProjectStorageService } from "@/lib/podcast-template/project-storage-service";
import type { PodcastProject } from "@/types/podcast-template";

const storage = new ProjectStorageService();

export async function GET() {
  const projects = await storage.list();
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<PodcastProject>;
    const created = await storage.create(body);
    return NextResponse.json({ project: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
