"use client";

import type { ImageIntelligence } from "@/app/lib/match-report/types";
import { libraryImagePreviewUrl } from "@/app/match-report-builder/components/LibraryImagePickerModal";

type Props = {
  imageIntelligence: ImageIntelligence;
};

function assetPreviewUrl(asset: { url: string; rel?: string }): string {
  if (asset.rel?.trim()) return libraryImagePreviewUrl(asset.rel);
  return libraryImagePreviewUrl(asset.url);
}

export function HeroPreviewGrid({ imageIntelligence }: Props) {
  const tiles = [
    { label: "Hero", asset: imageIntelligence.hero },
    { label: "Instagram", asset: imageIntelligence.variants?.instagram },
    { label: "Stories", asset: imageIntelligence.variants?.stories },
    { label: "YouTube", asset: imageIntelligence.variants?.youtubeThumb },
  ].filter((row) => row.asset?.url || row.asset?.rel);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tiles.map((row) => (
        <figure
          key={row.label}
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetPreviewUrl(row.asset!)}
            alt={row.label}
            className="aspect-video w-full object-cover"
          />
          <figcaption className="px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)]">{row.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
