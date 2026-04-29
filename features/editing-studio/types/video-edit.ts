/** Non-destructive video prep stored on {@link EditingAsset.meta}. */
export const VIDEO_EDIT_META_KEY = "videoEdit" as const;

export type VideoOutputAspect = "original" | "9:16" | "16:9" | "1:1";

export type VideoEditSettingsV1 = {
  version: 1;
  /** In-point relative to source file (seconds). */
  trimStartSec: number;
  /** Out-point; `null` means use full duration after trim start. */
  trimEndSec: number | null;
  /** Force silent output (mutually exclusive with useSourceAudio in export — UI may combine). */
  muted: boolean;
  /** Prefer muxed source audio when exporting. */
  useSourceAudio: boolean;
  /** Poster / cover frame time (seconds). */
  coverFrameSec: number;
  /** Target framing for vertical / square social exports. */
  outputAspect: VideoOutputAspect;
  /** Letterbox / pillarbox blur fill when converting to vertical. */
  verticalBlurFill: boolean;
  headlineOverlay: boolean;
  /** Burn in subtitles when asset/project has subtitle tracks. */
  useSubtitles: boolean;
  logoBug: boolean;
  outroCard: boolean;
};

export type VideoAssetMetaBag = {
  originalRelPath?: string;
  videoEdit?: VideoEditSettingsV1;
  /** Optional app-relative path to a sidecar subtitle file (e.g. .srt). */
  subtitleRelPath?: string;
  [key: string]: unknown;
};
