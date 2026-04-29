import { NextResponse } from "next/server";
import { PodcastTemplateService } from "@/lib/podcast-template/podcast-template-service";

const svc = new PodcastTemplateService();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { projectId?: string };
    const id = String(body.projectId ?? "").trim();
    if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    const project = await svc.storage.get(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!project.segments.length) return NextResponse.json({ error: "Parse script first" }, { status: 400 });
    const generated = await svc.generateAudio(project);
    return NextResponse.json({ project: generated, outputAudioRel: generated.outputAudioRel });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
