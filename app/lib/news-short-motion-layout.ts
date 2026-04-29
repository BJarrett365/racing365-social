/**
 * Shared motion-backdrop layering for News Shorts:
 * - Server PNG (`renderNewsShortSlide` + transparent compositing)
 * - Client `PreviewSlide` and Content preview
 *
 * Stacking (over video): **opaque** uniform black (`motionBackdropOpaqueOpacity`) → **gradient**
 * (`motionBackdropDimStrength` scales the full-frame + panel ramps only).
 */

export function clampMotionBackdropDimStrength(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.6, Math.max(0.25, n));
}

/** Uniform black wash over motion (separate from the readability gradient). Default ~0.30. */
export function clampMotionBackdropOpaqueOpacity(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0.3;
  return Math.min(0.85, Math.max(0, n));
}

/** Full-frame dim over motion (under slide chrome, above video in composite). */
export function newsShortMotionFullFrameGradient(strength?: number): string {
  const k = clampMotionBackdropDimStrength(strength ?? 1);
  const a = (v: number) => Math.min(0.94, v * k).toFixed(3);
  return `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${a(0.22)}) 32%, rgba(0,0,0,${a(0.5)}) 52%, rgba(0,0,0,${a(0.72)}) 78%, rgba(0,0,0,${a(0.82)}) 100%)`;
}

/** Bottom panel fill when compositing over motion (replaces flat panel colour). */
export function newsShortMotionPanelGradient(strength?: number): string {
  const k = clampMotionBackdropDimStrength(strength ?? 1);
  const a = (v: number) => Math.min(0.97, v * k).toFixed(3);
  return `linear-gradient(180deg, rgba(0,0,0,${a(0.52)}) 0%, rgba(0,0,0,${a(0.92)}) 100%)`;
}

export function newsShortMotionPanelBorder(): string {
  return "1px solid rgba(255,255,255,0.1)";
}

/** Tighter headline / subline line-height for motion + quote-style layout. */
export function newsShortMotionTightLineHeight(lineHeight: number): number {
  return Math.max(0.86, Math.min(1.12, lineHeight * 0.9));
}

export const NEWS_SHORT_MOTION_LETTER_SPACING = "0.04em";

/** Inline style for the dim overlay layer (React `style={...}`). */
export function newsShortMotionDimOverlayStyle(strength?: number): {
  background: string;
  pointerEvents: "none";
} {
  return {
    background: newsShortMotionFullFrameGradient(strength),
    pointerEvents: "none",
  };
}

/** Full-frame solid black at given alpha (z-index layer under the gradient). */
export function newsShortMotionOpaqueOverlayStyle(opacity?: number): {
  background: string;
  pointerEvents: "none";
} {
  const o = clampMotionBackdropOpaqueOpacity(opacity ?? 0.3);
  return {
    background: `rgba(0,0,0,${o.toFixed(3)})`,
    pointerEvents: "none",
  };
}
