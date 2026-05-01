import { NextResponse } from "next/server";
import { fetchYouTubeMetadata } from "@/app/lib/youtube-script/metadata";
import { extractYouTubeVideoId } from "@/app/lib/youtube-script/utils";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string; videoId?: string };
    const videoId = body.videoId || extractYouTubeVideoId(body.url ?? "");
    if (!videoId) {
      return NextResponse.json({ error: "Paste a valid YouTube URL or video ID." }, { status: 400 });
    }
    const meta = await fetchYouTubeMetadata(videoId);
    return NextResponse.json({ meta });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Metadata fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
