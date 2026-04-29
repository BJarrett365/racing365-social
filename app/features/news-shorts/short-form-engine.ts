/**
 * Vertical short-form video engine — export contract (schema + builder).
 * Layers (z-index): background → middle motion → foreground content → subtitles.
 */

import type {
  BackingMusicConfig,
  NewsShortAnimationStyle,
  NewsShortBackgroundAnimation,
  NewsShortSlide,
  NewsShortTemplateData,
  VideoRecordCirclePosition,
  VideoRecordLayout,
} from "@/app/features/news-shorts/types";
import type { AudioBuildSource } from "@/app/lib/news-shorts-build-sources";
import { motionBackdropRelLooksLikeCameraRecording } from "@/app/lib/news-shorts-build-sources";
import type { CreativeExportFormat } from "@/app/features/news-shorts/creative-video-format";
import {
  coerceLayoutPresetForFormat,
  engineSafeZoneForFormat,
  exportFormatForCreativeVideo,
  normalizeCreativeVideoFormat,
  videoDimensionsForCreativeFormat,
} from "@/app/features/news-shorts/creative-video-format";
import type { CreativeVideoFormatId } from "@/app/features/news-shorts/types";

export const SHORT_FORM_ENGINE_SCHEMA_VERSION = 1 as const;

/** Middle layer geometry (separate from z-order). */
export type MiddleLayerLayoutMode =
  | "full_frame"
  | "top_half"
  | "bottom_half"
  | "inset_card"
  | "circle_facecam";

export type BackgroundLayerKind = "none" | "static_image" | "looping_video" | "gradient" | "blurred_hero";

export type MiddleLayerKind = "none" | "camera_record" | "uploaded_video" | "runway" | "i2v";

export type ForegroundLayerKind = "slides_html";

export type MotionFocus = "text" | "middle" | "background";

export type ShortFormBackgroundLayer = {
  zIndex: 0;
  kind: BackgroundLayerKind;
  /** Project-relative path under `output/` when applicable */
  assetRel?: string;
  /** Article / library image URL or path used as still */
  heroRef?: string;
  muted: boolean;
  effects: {
    blur?: boolean;
    darken?: boolean;
    slowZoom?: boolean;
  };
};

export type ShortFormMiddleLayer = {
  zIndex: 1;
  kind: MiddleLayerKind;
  layoutMode: MiddleLayerLayoutMode;
  assetRel?: string;
  /** Mux audio from this clip when `useClipAudio` */
  useClipAudio: boolean;
  opacity: number;
  notes?: string;
};

export type ShortFormForegroundLayer = {
  zIndex: 2;
  kind: ForegroundLayerKind;
  template: "news-short";
  /** Safe-area / layout profile for the active Creative Studio format. */
  safeZone: string;
  style: {
    overlayOpacity: number;
    panelColor: string;
    fontSize: number;
  };
};

export type ShortFormSubtitlesLayer = {
  zIndex: 3;
  burnIn: boolean;
  /** Path relative to output dir */
  srtRel?: string;
  format: "srt";
};

export type ShortFormAudio = {
  /** Primary soundtrack source for this export (matches `resolveOutputAudioSource`) */
  narrationSource: AudioBuildSource;
  clipAudioEnabled: boolean;
  backgroundVideoMutedByDefault: boolean;
  backingMusic?: {
    enabled: boolean;
    sourceType?: string;
    assetRel?: string;
    volume: number;
    ducking: boolean;
    duckStrength: number;
    loop: boolean;
    fadeInMs: number;
    fadeOutMs: number;
    trimStartMs: number;
    trimEndMs?: number;
  };
  priority: Array<"recorded_voice" | "tts" | "middle_layer_audio">;
};

export type ShortFormSceneExport = {
  id: string;
  type: NewsShortSlide["type"];
  durationSec: number;
  headline: string;
  bodyText: string;
  voiceoverLine: string;
  subtitleLine: string;
  layerConfig: {
    motionFocus: MotionFocus;
  };
  animation: {
    foreground: NewsShortAnimationStyle;
    background: NewsShortBackgroundAnimation;
    backgroundZoom: number;
  };
};

export type ShortFormSafety = {
  maxMotionSources: 2;
  textContrast: "enforced_overlay";
  safeZones: string;
};

export type ShortFormEngineExport = {
  schemaVersion: typeof SHORT_FORM_ENGINE_SCHEMA_VERSION;
  contentId: string;
  /** Creative Studio export facet: shorts | portrait | landscape */
  format: CreativeExportFormat;
  /** Canonical Creative Studio canvas id (distinct from `format`). */
  creativeVideoFormat: CreativeVideoFormatId;
  /** Active layout preset for HTML/PNG/ASS styling. */
  creativeLayoutPreset: string;
  video: {
    format: "9:16" | "16:9";
    width: number;
    height: number;
    fps: 30;
    durationSec: number;
  };
  layers: {
    background: ShortFormBackgroundLayer;
    middle: ShortFormMiddleLayer;
    foreground: ShortFormForegroundLayer;
    subtitles: ShortFormSubtitlesLayer;
  };
  audio: ShortFormAudio;
  /** Active composition flags for this build */
  buildModes: string[];
  scenes: ShortFormSceneExport[];
  safety: ShortFormSafety;
};

function layoutToMiddleMode(layout: VideoRecordLayout): MiddleLayerLayoutMode {
  if (layout === "half") return "top_half";
  if (layout === "circle") return "circle_facecam";
  return "full_frame";
}

function classifyMiddleKind(rel: string | undefined): MiddleLayerKind {
  if (!rel?.trim()) return "none";
  if (motionBackdropRelLooksLikeCameraRecording(rel)) return "camera_record";
  if (/runway|i2v/i.test(rel)) return "runway";
  return "uploaded_video";
}

/**
 * Builds the canonical engine export object from News Shorts build inputs.
 * Intended for API responses, sidecar JSON, and future renderers.
 */
export function buildShortFormEngineExport(input: {
  contentId: string;
  template: NewsShortTemplateData;
  slides: NewsShortSlide[];
  scenes: Array<{ id: string; durationSec: number; caption: string }>;
  audioSource: AudioBuildSource;
  dualCompositeActive: boolean;
  /** Same as build: backdrop file when dual; else single motion rel from `resolveMotionBackdropRel` */
  backgroundVideoRel?: string;
  videoRecordingRel?: string;
  /** Resolved single motion rel when not dual (camera or one backdrop clip) */
  resolvedMotionRel?: string;
  backgroundImageRel?: string;
  videoRecordLayout: VideoRecordLayout;
  videoRecordCirclePosition: VideoRecordCirclePosition;
  useVideoAudio: boolean;
  backingMusic?: BackingMusicConfig;
  burnSubtitles: boolean;
}): ShortFormEngineExport {
  const { template, slides, scenes, contentId } = input;
  const durationSec = scenes.reduce((a, s) => a + s.durationSec, 0);
  const creativeFmt = normalizeCreativeVideoFormat(template.creativeVideoFormat);
  const exportFmt = exportFormatForCreativeVideo(creativeFmt);
  const canvas = videoDimensionsForCreativeFormat(creativeFmt);
  const safeZoneKey = engineSafeZoneForFormat(creativeFmt);
  const layoutPreset = coerceLayoutPresetForFormat(creativeFmt, template.creativeLayoutPreset);

  const cam = input.videoRecordingRel?.trim();
  const bgv = input.backgroundVideoRel?.trim();
  const bgi = input.backgroundImageRel?.trim();
  const hero = template.heroImage?.trim();
  const motionRel = input.resolvedMotionRel?.trim();

  const layoutMode = layoutToMiddleMode(input.videoRecordLayout);
  const circleNote =
    input.videoRecordLayout === "circle"
      ? `circle_facecam anchor: ${input.videoRecordCirclePosition}`
      : undefined;

  let background: ShortFormBackgroundLayer;
  let middle: ShortFormMiddleLayer;
  const buildModes: string[] = ["slides", "animations"];

  if (input.dualCompositeActive && bgv && cam) {
    buildModes.push("slides_plus_background_video", "slides_plus_middle_video", "full_mixed");
    background = {
      zIndex: 0,
      kind: "looping_video",
      assetRel: bgv,
      muted: !input.useVideoAudio,
      effects: { darken: true, blur: false },
    };
    middle = {
      zIndex: 1,
      kind: classifyMiddleKind(cam),
      layoutMode,
      assetRel: cam,
      useClipAudio: input.useVideoAudio,
      opacity: 1,
      notes: ["Dual stack: backdrop video z:0 + camera middle z:1", circleNote].filter(Boolean).join(" · "),
    };
  } else if (motionRel) {
    const isCamera = motionBackdropRelLooksLikeCameraRecording(motionRel);
    if (isCamera) {
      buildModes.push("slides_plus_middle_video");
      background = {
        zIndex: 0,
        kind: bgi ? "static_image" : hero ? "blurred_hero" : "gradient",
        assetRel: bgi,
        heroRef: hero || undefined,
        muted: true,
        effects: { blur: Boolean(hero && !bgi), darken: true, slowZoom: true },
      };
      middle = {
        zIndex: 1,
        kind: "camera_record",
        layoutMode,
        assetRel: motionRel,
        useClipAudio: input.useVideoAudio,
        opacity: 1,
        notes: circleNote,
      };
    } else {
      buildModes.push("slides_plus_background_video");
      background = {
        zIndex: 0,
        kind: "looping_video",
        assetRel: motionRel,
        muted: !input.useVideoAudio,
        effects: { darken: true },
      };
      middle = {
        zIndex: 1,
        kind: "none",
        layoutMode: "full_frame",
        useClipAudio: false,
        opacity: 1,
        notes: "Full-frame motion clip composited as background layer under slide PNGs",
      };
    }
  } else {
    buildModes.push("slides_only", bgi || hero ? "slides_plus_background_image" : "slides_only");
    background = {
      zIndex: 0,
      kind: bgi ? "static_image" : hero ? "blurred_hero" : "gradient",
      assetRel: bgi,
      heroRef: hero || undefined,
      muted: true,
      effects: { blur: Boolean(hero && !bgi), darken: true, slowZoom: true },
    };
    middle = {
      zIndex: 1,
      kind: "none",
      layoutMode: "full_frame",
      useClipAudio: false,
      opacity: 1,
    };
  }

  const foreground: ShortFormForegroundLayer = {
    zIndex: 2,
    kind: "slides_html",
    template: "news-short",
    safeZone: safeZoneKey,
    style: {
      overlayOpacity: template.style.overlayOpacity,
      panelColor: template.style.panelColor,
      fontSize: template.style.fontSize,
    },
  };

  const subtitles: ShortFormSubtitlesLayer = {
    zIndex: 3,
    burnIn: input.burnSubtitles,
    srtRel: `subtitles/${contentId}.srt`,
    format: "srt",
  };

  const audio: ShortFormAudio = {
    narrationSource: input.audioSource,
    clipAudioEnabled: input.useVideoAudio,
    backgroundVideoMutedByDefault: true,
    backingMusic: input.backingMusic?.enabled
      ? {
          enabled: true,
          sourceType: input.backingMusic.sourceType,
          assetRel: input.backingMusic.assetRel,
          volume: input.backingMusic.volume,
          ducking: input.backingMusic.ducking,
          duckStrength: input.backingMusic.duckStrength,
          loop: input.backingMusic.loop,
          fadeInMs: input.backingMusic.fadeInMs,
          fadeOutMs: input.backingMusic.fadeOutMs,
          trimStartMs: input.backingMusic.trimStartMs,
          trimEndMs: input.backingMusic.trimEndMs,
        }
      : undefined,
    priority: input.useVideoAudio
      ? ["middle_layer_audio", "recorded_voice", "tts"]
      : ["recorded_voice", "tts", "middle_layer_audio"],
  };

  const sceneExports: ShortFormSceneExport[] = slides.map((slide) => {
    const sc = scenes.find((x) => x.id === slide.id);
    const cap = sc?.caption ?? (slide.headline || slide.subline);
    const motionFocus: MotionFocus =
      middle.kind !== "none" && input.videoRecordLayout !== "full" ? "middle" : "text";
    return {
      id: slide.id,
      type: slide.type,
      durationSec: sc?.durationSec ?? slide.durationSec,
      headline: slide.headline,
      bodyText: slide.subline,
      voiceoverLine: cap,
      subtitleLine: cap,
      layerConfig: { motionFocus },
      animation: {
        foreground: slide.animationStyle,
        background: slide.backgroundAnimation,
        backgroundZoom: slide.backgroundZoom,
      },
    };
  });

  return {
    schemaVersion: SHORT_FORM_ENGINE_SCHEMA_VERSION,
    contentId,
    format: exportFmt,
    creativeVideoFormat: creativeFmt,
    creativeLayoutPreset: layoutPreset,
    video: {
      format: canvas.aspectBucket,
      width: canvas.width,
      height: canvas.height,
      fps: 30,
      durationSec,
    },
    layers: {
      background,
      middle,
      foreground,
      subtitles,
    },
    audio,
    buildModes,
    scenes: sceneExports,
    safety: {
      maxMotionSources: 2,
      textContrast: "enforced_overlay",
      safeZones: safeZoneKey,
    },
  };
}
