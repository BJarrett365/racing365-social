"use client";

import type { VideoEditSettingsV1 } from "@/features/editing-studio/types/video-edit";

function aspectClass(aspect: VideoEditSettingsV1["outputAspect"]): string {
  switch (aspect) {
    case "9:16":
      return "aspect-[9/16]";
    case "16:9":
      return "aspect-video";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-video";
  }
}

type Props = {
  src: string;
  settings: VideoEditSettingsV1;
  /** Shown when headline overlay is on */
  headline?: string;
  className?: string;
};

/**
 * Approximate editorial preview (CSS only). Export pipeline will match in production.
 */
export function VideoEditPreview({ src, settings, headline = "Headline preview", className = "" }: Props) {
  const vertical = settings.outputAspect === "9:16";
  const blurFill = vertical && settings.verticalBlurFill;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-zinc-950 ${aspectClass(settings.outputAspect)} ${className}`}>
      {blurFill ? (
        <video
          src={src}
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl"
          muted={settings.muted}
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : null}
      <div className="relative z-[2] flex h-full w-full items-center justify-center overflow-hidden bg-black/20">
        <video
          src={src}
          className={`h-full w-full ${vertical ? "object-contain" : "object-cover"}`}
          muted={settings.muted}
          playsInline
          controls
          preload="metadata"
        />
      </div>
      {settings.headlineOverlay ? (
        <div className="pointer-events-none absolute bottom-12 left-3 right-3 z-[20] text-center text-sm font-bold text-white drop-shadow-md">
          {headline}
        </div>
      ) : null}
      {settings.useSubtitles ? (
        <div className="pointer-events-none absolute bottom-16 left-3 right-3 z-[19] text-center text-xs font-medium text-white drop-shadow-md">
          Subtitle preview
        </div>
      ) : null}
      {settings.logoBug ? (
        <div className="pointer-events-none absolute right-2 top-2 z-[20] rounded border border-white/30 bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-900">
          Logo
        </div>
      ) : null}
      {settings.outroCard ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[18] -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-900 shadow-lg">
          Outro card
        </div>
      ) : null}
    </div>
  );
}
