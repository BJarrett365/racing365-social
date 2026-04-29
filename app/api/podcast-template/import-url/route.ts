import { NextResponse } from "next/server";
import { PodcastTemplateService } from "@/lib/podcast-template/podcast-template-service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: string };
    const url = String(body.url ?? "").trim();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });
    const imported = await new PodcastTemplateService().importUrlDraft(url);
    return NextResponse.json(imported);
  } catch (e) {
    const message = e instanceof Error ? e.message : "URL import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
