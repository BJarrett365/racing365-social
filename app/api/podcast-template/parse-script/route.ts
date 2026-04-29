import { NextResponse } from "next/server";
import { ScriptParserService } from "@/lib/podcast-template/script-parser-service";
import type { PodcastSpeaker } from "@/types/podcast-template";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { script?: string; speakers?: PodcastSpeaker[] };
    const script = String(body.script ?? "");
    if (!script.trim()) return NextResponse.json({ error: "Script is required" }, { status: 400 });
    const parsed = new ScriptParserService().parse({
      script,
      existingSpeakers: Array.isArray(body.speakers) ? body.speakers : [],
    });
    if (parsed.errors.length) return NextResponse.json({ error: parsed.errors[0] }, { status: 400 });
    return NextResponse.json({ segments: parsed.segments, speakers: parsed.speakers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
