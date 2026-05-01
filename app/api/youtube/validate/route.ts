import { NextResponse } from "next/server";
import { canonicalYouTubeUrl, extractYouTubeVideoId } from "@/app/lib/youtube-script/utils";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const videoId = extractYouTubeVideoId(body.url ?? "");
    if (!videoId) {
      return NextResponse.json({ valid: false, error: "Paste a valid YouTube URL or video ID." }, { status: 400 });
    }
    return NextResponse.json({ valid: true, videoId, url: canonicalYouTubeUrl(videoId) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
