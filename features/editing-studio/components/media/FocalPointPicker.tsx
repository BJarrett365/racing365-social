"use client";

import { useCallback, useRef } from "react";
import type { NormalizedPoint } from "@/features/editing-studio/types/image-edit";

type Props = {
  value: NormalizedPoint;
  onChange: (p: NormalizedPoint) => void;
  className?: string;
  disabled?: boolean;
  /** Optional label for a11y */
  label?: string;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Click or drag to set a normalised focal point (0–1) within the padded box.
 */
export function FocalPointPicker({ value, onChange, className = "", disabled, label = "Focal point" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el || disabled) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const x = clamp01((clientX - r.left) / r.width);
      const y = clamp01((clientY - r.top) / r.height);
      onChange({ x, y });
    },
    [disabled, onChange],
  );

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      className={`relative touch-none rounded-md border border-white/30 bg-zinc-900/40 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-400 ${disabled ? "pointer-events-none cursor-not-allowed opacity-0" : "cursor-crosshair"} ${className}`}
      onPointerDown={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        pick(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        pick(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        const step = e.shiftKey ? 0.05 : 0.01;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onChange({ x: clamp01(value.x - step), y: value.y });
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onChange({ x: clamp01(value.x + step), y: value.y });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange({ x: value.x, y: clamp01(value.y - step) });
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange({ x: value.x, y: clamp01(value.y + step) });
        }
      }}
    >
      <div
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-amber-400/30 shadow"
        style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}
      />
      <div
        className="pointer-events-none absolute h-px w-full bg-white/20"
        style={{ top: `${value.y * 100}%` }}
      />
      <div
        className="pointer-events-none absolute h-full w-px bg-white/20"
        style={{ left: `${value.x * 100}%` }}
      />
    </div>
  );
}
