"use client";

import { useCallback, useRef } from "react";
import { PREVIEW_PLATFORM_ORDER, previewPlatformLabel } from "@/features/editing-studio/preview/preview-platforms";
import type { PlatformType } from "@/features/editing-studio/types/domain";

type Props = {
  value: PlatformType;
  onChange: (p: PlatformType) => void;
  className?: string;
};

export function PlatformSwitcher({ value, onChange, className = "" }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setTabRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    tabRefs.current[index] = el;
  }, []);

  const focusIndex = useCallback((index: number) => {
    requestAnimationFrame(() => tabRefs.current[index]?.focus());
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const cur = PREVIEW_PLATFORM_ORDER.indexOf(value);
      if (cur < 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (cur + 1) % PREVIEW_PLATFORM_ORDER.length;
        onChange(PREVIEW_PLATFORM_ORDER[next]!);
        focusIndex(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = (cur - 1 + PREVIEW_PLATFORM_ORDER.length) % PREVIEW_PLATFORM_ORDER.length;
        onChange(PREVIEW_PLATFORM_ORDER[next]!);
        focusIndex(next);
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(PREVIEW_PLATFORM_ORDER[0]!);
        focusIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        const last = PREVIEW_PLATFORM_ORDER.length - 1;
        onChange(PREVIEW_PLATFORM_ORDER[last]!);
        focusIndex(last);
      }
    },
    [focusIndex, onChange, value],
  );

  return (
    <div
      className={`flex flex-wrap gap-1 ${className}`}
      role="tablist"
      aria-label="Preview platform"
      onKeyDown={onKeyDown}
    >
      {PREVIEW_PLATFORM_ORDER.map((p, index) => {
        const selected = value === p;
        return (
          <button
            key={p}
            ref={(el) => setTabRef(index, el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(p)}
            className={`rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight transition sm:text-xs ${
              selected
                ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--text-primary)]"
                : "border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
            style={{ borderColor: selected ? undefined : "var(--border)" }}
          >
            {previewPlatformLabel(p)}
          </button>
        );
      })}
    </div>
  );
}
