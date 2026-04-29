"use client";

type Props = {
  /** Typical “feed” safe inset (title safe on IG / X). */
  variant?: "feed" | "story";
  className?: string;
};

/**
 * Non-interactive guide overlay (percent insets). Does not affect export — preview only unless
 * you bake into a future render pipeline.
 */
export function SafeZoneOverlay({ variant = "feed", className = "" }: Props) {
  const top = variant === "story" ? 14 : 6;
  const bottom = variant === "story" ? 28 : 10;
  const side = variant === "story" ? 8 : 6;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[25] ${className}`}
      aria-hidden
    >
      <div
        className="absolute border border-dashed border-amber-400/70 bg-amber-400/5"
        style={{
          top: `${top}%`,
          left: `${side}%`,
          right: `${side}%`,
          bottom: `${bottom}%`,
        }}
      />
      <p className="absolute left-2 top-1 text-[9px] font-medium uppercase tracking-wide text-amber-200/90">
        Safe zone
      </p>
    </div>
  );
}
