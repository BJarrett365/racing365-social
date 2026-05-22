import { NextResponse } from "next/server";
import { buildShortVideo } from "@/app/features/video/video-builder";
import { ffmpegResolutionDebug } from "@/app/features/video/ffmpeg-utils";
import { normalizeVoiceProviderPreference, resolveVoiceTrackWithFallback } from "@/app/features/audio";
import { buildVideoSlug } from "@/app/lib/seo-slug";
import type { ContentFormat, VoiceGender } from "@/types";

type Body = {
  contentId: string;
  format: ContentFormat;
  script: string;
  /** Editable headline — drives SEO title and download slug */
  headline?: string;
  scenes: { imagePath: string; durationSec: number; caption: string }[];
  burnSubtitles?: boolean;
  /** Motion background (must match transparent renders from editor upload) */
  backgroundVideoRel?: string | null;
  voiceGender?: VoiceGender;
  /** 0.5–2, default 1 */
  voiceSpeed?: number;
  elevenlabsVoiceId?: string;
  voiceProviderPreference?: string;
  outputWidth?: number;
  outputHeight?: number;
  buildMode?: "shorts" | "portrait" | "landscape";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.contentId || !body?.scenes?.length || !body?.script) {
      return NextResponse.json(
        { error: "contentId, script, and scenes required" },
        { status: 400 },
      );
    }

    const seoTitle = (body.headline?.trim() || body.contentId).slice(0, 300);
    const seoSlug = buildVideoSlug(seoTitle, body.contentId);

    const gender: VoiceGender = body.voiceGender === "male" ? "male" : "female";
    const speedRaw = Number(body.voiceSpeed);
    const speed = Number.isFinite(speedRaw)
      ? Math.min(2, Math.max(0.5, speedRaw))
      : 1;

    const audio = await resolveVoiceTrackWithFallback(body.script, body.contentId, {
      gender,
      speed,
      voiceId: body.elevenlabsVoiceId?.trim() || undefined,
      providerPreference: normalizeVoiceProviderPreference(body.voiceProviderPreference),
    });
    const audioPath = audio.audioPath;
    const result = await buildShortVideo({
      contentId: body.contentId,
      format: body.format,
      scenes: body.scenes,
      audioPath,
      burnSubtitles: body.burnSubtitles,
      seoTitle,
      seoSlug,
      backgroundVideoRel: body.backgroundVideoRel?.trim() || undefined,
      outputWidth: body.outputWidth,
      outputHeight: body.outputHeight,
      buildMode: body.buildMode,
    });

    return NextResponse.json({
      videoPath: result.videoPath,
      srtPath: result.srtPath,
      concatPath: result.concatPath,
      audioPath,
      voiceProvider: audio.provider,
      voiceFallbackReason: audio.fallbackReason,
      seoTitle,
      seoSlug,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const ffmpegDebug = message.toLowerCase().includes("ffmpeg") ? ffmpegResolutionDebug() : undefined;
    // #region agent log
    fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'live-ffmpeg-initial',hypothesisId:'H1,H2,H3,H4',location:'app/api/build-short/route.ts:catch',message:'build-short server error',data:{hasFfmpegDebug:Boolean(ffmpegDebug),error:message,ffmpegDebug},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: message, debug: ffmpegDebug ? { ffmpeg: ffmpegDebug } : undefined }, { status: 500 });
  }
}
