"use client";

import { useCallback, useState } from "react";

const EXAMPLES_BASE = "/templates/examples";

type Props = {
  /** File name without extension: `public/templates/examples/{slug}.mp4` */
  slug: string;
  /** Library video rel path, e.g. `video/{id}-short.mp4` */
  libraryRel?: string;
  /** Accessible label */
  label: string;
  /** Custom placeholder when no preview video exists */
  placeholderLabel?: string;
  placeholderHint?: string;
};

/**
 * Small portrait preview for the templates hub. Place an MP4 at
 * `public/templates/examples/{slug}.mp4` (e.g. muted H.264 Shorts export).
 * If the file is missing, shows a compact placeholder.
 */
export function TemplateVideoThumbnail({
  slug,
  libraryRel,
  label,
  placeholderLabel,
  placeholderHint,
}: Props) {
  const fallbackSrc = `${EXAMPLES_BASE}/${slug}.mp4`;
  const candidates = [
    ...(libraryRel ? [`/api/file?rel=${encodeURIComponent(libraryRel)}`] : []),
    fallbackSrc,
  ];
  const [candidateIdx, setCandidateIdx] = useState(0);

  const onError = useCallback(() => {
    setCandidateIdx((idx) => idx + 1);
  }, []);

  const src = candidates[candidateIdx];

  if (!src) {
    return (
      <div
        className="flex aspect-[9/16] h-[140px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed px-2 text-center transition-[border-color,background-color] duration-200"
        style={{
          borderColor: "var(--border-strong)",
          background: "var(--surface-muted)",
          color: "var(--text-muted)",
        }}
        title={`Add a library video or public/templates/examples/${slug}.mp4 to show a preview`}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wide">
          {placeholderLabel ?? "Example"}
        </span>
        <span className="mt-1 text-[9px] leading-tight opacity-90">
          {placeholderHint ?? "Video · coming soon"}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-200"
      style={{
        borderColor: "var(--border)",
        background: "var(--media-backdrop)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <video
        className="h-[140px] w-[79px] object-cover sm:h-[156px] sm:w-[88px]"
        src={src}
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
        aria-label={`${label} example video`}
        onError={onError}
      />
    </div>
  );
}
