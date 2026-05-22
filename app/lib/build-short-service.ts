import { buildShortVideo } from "@/app/features/video/video-builder";
import { normalizeVoiceProviderPreference, resolveVoiceTrackWithFallback } from "@/app/features/audio";
import { buildVideoSlug } from "@/app/lib/seo-slug";
import type { ContentFormat, VoiceGender } from "@/types";

export type BuildShortRequestBody = {
  contentId: string;
  format: ContentFormat;
  script: string;
  headline?: string;
  scenes: { imagePath: string; durationSec: number; caption: string }[];
  burnSubtitles?: boolean;
  backgroundVideoRel?: string | null;
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  elevenlabsVoiceId?: string;
  voiceProviderPreference?: string;
  outputWidth?: number;
  outputHeight?: number;
  buildMode?: "shorts" | "portrait" | "landscape";
};

export type BuildShortPayload = {
  videoPath?: string;
  srtPath?: string;
  concatPath?: string;
  audioPath?: string;
  voiceProvider?: string;
  voiceFallbackReason?: string;
  seoTitle?: string;
  seoSlug?: string;
  error?: string;
};

export async function buildShortPayload(
  body: BuildShortRequestBody,
  options?: { onProgress?: (phase: string) => void | Promise<void> },
): Promise<BuildShortPayload> {
  if (!body?.contentId || !body?.scenes?.length || !body?.script) {
    return { error: "contentId, script, and scenes required" };
  }

  const seoTitle = (body.headline?.trim() || body.contentId).slice(0, 300);
  const seoSlug = buildVideoSlug(seoTitle, body.contentId);

  const gender: VoiceGender = body.voiceGender === "male" ? "male" : "female";
  const speedRaw = Number(body.voiceSpeed);
  const speed = Number.isFinite(speedRaw) ? Math.min(2, Math.max(0.5, speedRaw)) : 1;

  await options?.onProgress?.("voice");
  const audio = await resolveVoiceTrackWithFallback(body.script, body.contentId, {
    gender,
    speed,
    voiceId: body.elevenlabsVoiceId?.trim() || undefined,
    providerPreference: normalizeVoiceProviderPreference(body.voiceProviderPreference),
  });
  const audioPath = audio.audioPath;
  await options?.onProgress?.("encoding");
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

  return {
    videoPath: result.videoPath,
    srtPath: result.srtPath,
    concatPath: result.concatPath,
    audioPath,
    voiceProvider: audio.provider,
    voiceFallbackReason: audio.fallbackReason,
    seoTitle,
    seoSlug,
  };
}
