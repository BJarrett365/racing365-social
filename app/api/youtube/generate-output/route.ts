import { NextResponse } from "next/server";
import { generateYouTubeScriptOutput } from "@/app/lib/youtube-script/ai";
import type { ScriptOutputType, TranscriptResult, YouTubeVideoMeta } from "@/app/lib/youtube-script/types";

const outputTypes: ScriptOutputType[] = [
  "clean_transcript",
  "summary",
  "article",
  "video_script",
  "podcast_script",
  "shorts_script",
  "social_captions",
  "quote_clips",
  "subtitles",
  "translation",
];

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      meta?: YouTubeVideoMeta;
      transcript?: TranscriptResult;
      outputType?: ScriptOutputType;
      brandTone?: string;
      outputLanguage?: string;
      contentStyle?: string;
      sportContext?: string;
      rewriteStyle?: string;
      journalistProfileName?: string;
      journalistStyle?: string;
    };
    if (!body.meta?.videoId) return NextResponse.json({ error: "Video metadata is required." }, { status: 400 });
    if (!body.transcript?.fullText?.trim()) return NextResponse.json({ error: "Transcript text is required." }, { status: 400 });
    if (!body.outputType || !outputTypes.includes(body.outputType)) {
      return NextResponse.json({ error: "Choose a valid output type." }, { status: 400 });
    }

    const output = await generateYouTubeScriptOutput({
      meta: body.meta,
      transcript: body.transcript,
      outputType: body.outputType,
      brandTone: body.brandTone,
      outputLanguage: body.outputLanguage,
      contentStyle: body.contentStyle,
      sportContext: body.sportContext,
      rewriteStyle: body.rewriteStyle,
      journalistProfileName: body.journalistProfileName,
      journalistStyle: body.journalistStyle,
    });
    return NextResponse.json({ output });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Output generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
