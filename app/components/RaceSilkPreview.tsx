"use client";

import { useEffect, useState } from "react";
import { raceSilkBadgeHtml } from "@/app/features/render/race-silk-html";
import { silkImageBoxHeight, silkImageBoxWidth } from "@/app/features/render/silk-render-shared";
import type { RunnerSilks } from "@/types";

function silksStableKey(s?: RunnerSilks): string {
  if (!s) return "";
  return [
    s.silkCode ?? "",
    s.imageUrl ?? "",
    s.imageAspectRatio ?? "",
    s.body ?? "",
    s.secondary ?? "",
    s.cap ?? "",
    s.accent ?? "",
    s.pattern ?? "",
  ].join("|");
}

/**
 * Inline silk preview for list pages. HTML is generated **after mount** so server HTML and the first
 * client pass match (avoids hydration mismatches from Node vs browser float / SVG differences in
 * `raceSilkBadgeHtml`, especially for bitmap + procedural fallback).
 */
export function RaceSilkPreview({
  silks,
  heightPx = 28,
  className = "",
}: {
  silks?: RunnerSilks;
  heightPx?: number;
  className?: string;
}) {
  const [mountedHtml, setMountedHtml] = useState<string | undefined>(undefined);
  const sk = silksStableKey(silks);

  useEffect(() => {
    setMountedHtml(raceSilkBadgeHtml(silks, heightPx) ?? "");
    // sk encodes silk fields; omit `silks` reference so parents can pass a fresh object each render without re-running
  }, [sk, heightPx]);

  if (mountedHtml === undefined) {
    const h = silkImageBoxHeight(heightPx);
    const w = silkImageBoxWidth(heightPx, silks?.imageAspectRatio);
    return (
      <span
        className={`inline-flex shrink-0 items-center leading-none ${className}`}
        aria-hidden
        style={{ width: w, height: h, minWidth: w, minHeight: h }}
      />
    );
  }

  if (!mountedHtml) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center leading-none ${className}`}
      dangerouslySetInnerHTML={{ __html: mountedHtml }}
    />
  );
}
