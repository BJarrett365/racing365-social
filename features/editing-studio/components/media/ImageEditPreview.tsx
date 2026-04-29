"use client";

import { SafeZoneOverlay } from "@/features/editing-studio/components/media/SafeZoneOverlay";
import { aspectRatioForPreset } from "@/features/editing-studio/lib/crop-aspect-presets";
import type { ImageEditSettingsV1 } from "@/features/editing-studio/types/image-edit";

type Props = {
  src: string;
  settings: ImageEditSettingsV1;
  alt?: string;
  safeZoneVariant?: "feed" | "story";
  className?: string;
};

export function ImageEditPreview({ src, settings, alt = "", safeZoneVariant = "feed", className = "" }: Props) {
  const ar = aspectRatioForPreset(settings.aspectPreset);
  const ox = (settings.focalPoint.x - settings.crop.x) / Math.max(settings.crop.w, 1e-6);
  const oy = (settings.focalPoint.y - settings.crop.y) / Math.max(settings.crop.h, 1e-6);
  const objPos = `${Math.max(0, Math.min(1, ox)) * 100}% ${Math.max(0, Math.min(1, oy)) * 100}%`;
  const filter = `brightness(${100 + settings.brightness}%) contrast(${100 + settings.contrast}%)`;

  const showBlurFill = settings.blurBackground && settings.extendMode === "blur";
  const showColorFill = settings.extendMode === "color";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-zinc-900 ${className}`}
      style={{ aspectRatio: ar }}
    >
      {showColorFill ? (
        <div className="absolute inset-0 z-0" style={{ backgroundColor: settings.extendColor ?? "#111827" }} />
      ) : null}
      {showBlurFill ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 z-[1] h-full w-full scale-125 object-cover opacity-90 blur-2xl"
          style={{ objectPosition: objPos }}
          draggable={false}
        />
      ) : null}

      <div className="relative z-[2] h-full w-full overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="absolute max-w-none"
          draggable={false}
          style={{
            width: `${100 / Math.max(settings.crop.w, 1e-6)}%`,
            height: `${100 / Math.max(settings.crop.h, 1e-6)}%`,
            left: `${(-settings.crop.x / Math.max(settings.crop.w, 1e-6)) * 100}%`,
            top: `${(-settings.crop.y / Math.max(settings.crop.h, 1e-6)) * 100}%`,
            objectPosition: objPos,
            filter,
          }}
        />
      </div>

      {settings.gradientOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-[20] bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      ) : null}

      {settings.safeZoneOverlay ? <SafeZoneOverlay variant={safeZoneVariant} /> : null}

      {settings.textBadge ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[30] max-w-[70%] truncate rounded bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Headline preview
        </div>
      ) : null}
      {settings.logoBadge ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[30] rounded border border-white/30 bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-tight text-zinc-900 shadow">
          Logo
        </div>
      ) : null}
      {settings.ctaChip ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[30] -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-zinc-900 shadow">
          Read more
        </div>
      ) : null}
    </div>
  );
}
