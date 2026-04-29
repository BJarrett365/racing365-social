"use client";

type Props = {
  className?: string;
};

/**
 * Approximate safe-area guides for vertical / story-style previews (not pixel-perfect).
 */
export function PreviewSafeZone({ className = "" }: Props) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-10 ${className}`} aria-hidden>
      <div
        className="absolute border border-dashed border-amber-400/60"
        style={{ top: "12%", left: "6%", right: "6%", bottom: "22%" }}
      />
      <span className="absolute left-1 top-2 text-[8px] font-medium uppercase tracking-wide text-amber-200/90">
        Safe area
      </span>
    </div>
  );
}
