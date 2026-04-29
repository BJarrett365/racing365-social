"use client";

import { useMemo } from "react";
import { PlatformPreviewCard } from "@/features/editing-studio/components/preview/PlatformPreviewCard";
import { PlatformSwitcher } from "@/features/editing-studio/components/preview/PlatformSwitcher";
import { resolvePreviewCopy, resolvePreviewMedia } from "@/features/editing-studio/preview/resolve-preview-data";
import type { EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";

type Props = {
  draft: EditingProject;
  previewPlatform: PlatformType;
  onPreviewPlatformChange: (p: PlatformType) => void;
  /** Tighter layout when embedded in the sidebar. */
  compact?: boolean;
};

export function PreviewPanel({ draft, previewPlatform, onPreviewPlatformChange, compact }: Props) {
  const copy = useMemo(() => resolvePreviewCopy(draft, previewPlatform), [draft, previewPlatform]);
  const media = useMemo(() => resolvePreviewMedia(draft), [draft]);
  const brandLabel = draft.brand?.trim() || getEditingProjectDisplayTitle(draft);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <PlatformSwitcher value={previewPlatform} onChange={onPreviewPlatformChange} />
      <p className="text-[10px] leading-snug text-[color:var(--text-muted)]">
        {copy.source === "variant"
          ? "Copy from the selected export variant for this platform (or the first variant if none picked)."
          : "Copy from editorial fields — add variants on the Variants tab for per-platform text."}
      </p>
      <div
        className={compact ? "max-h-[min(64vh,560px)] overflow-y-auto pr-1" : "max-h-[min(72vh,800px)] overflow-y-auto pr-1"}
      >
        <PlatformPreviewCard platform={previewPlatform} copy={copy} media={media} brandLabel={brandLabel} />
      </div>
      <p className="text-[10px] leading-relaxed text-[color:var(--text-muted)]">
        Approximate only — truncation and safe zones are indicative, not exact platform behaviour.
      </p>
    </div>
  );
}
