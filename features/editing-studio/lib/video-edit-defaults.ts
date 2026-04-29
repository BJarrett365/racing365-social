import type { VideoEditSettingsV1 } from "@/features/editing-studio/types/video-edit";

export function defaultVideoEditSettings(): VideoEditSettingsV1 {
  return {
    version: 1,
    trimStartSec: 0,
    trimEndSec: null,
    muted: false,
    useSourceAudio: true,
    coverFrameSec: 0,
    outputAspect: "original",
    verticalBlurFill: true,
    headlineOverlay: false,
    useSubtitles: false,
    logoBug: false,
    outroCard: false,
  };
}
