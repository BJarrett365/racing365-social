/**
 * Single layout model for News Shorts burned ASS (FFmpeg/libass) and browser dub preview.
 * All vertical placement derives from the same pixel margin (ASS Alignment=2 MarginV).
 */

export const NEWS_SHORT_CANVAS_W = 1080;
export const NEWS_SHORT_CANVAS_H = 1920;

/**
 * Reserved height at the bottom for PlanetF1 footer / branding.
 * Keep in sync with `.ns-footer` and `.ns-panel-wrap` in `renderNewsShortSlide` (html-templates).
 */
export const NEWS_SHORT_FOOTER_SAFE_PX = 52;

/** ASS burn uses ~2× slide headline size on 1080×1920 so text reads at phone distance. */
export const NEWS_SHORT_ASS_BURN_FONT_SCALE = 2;

/** Gap between the top of the footer zone and the bottom edge of the subtitle block. */
const SUBTITLE_CLEARANCE_ABOVE_FOOTER_PX = 14;

export function newsShortAssBurnHeadFontPx(slideFontSize: number): number {
  const s = NEWS_SHORT_ASS_BURN_FONT_SCALE;
  const fs = Number(slideFontSize);
  const base = Number.isFinite(fs) ? fs : 64;
  return Math.max(Math.round(28 * s), Math.min(Math.round(96 * s), Math.round(base * 0.62 * s)));
}

export function computeNewsShortAssMarginLRpx(
  textBoxWidthPct: number,
  frameWidth: number = NEWS_SHORT_CANVAS_W,
): number {
  const tw = Math.min(94, Math.max(50, textBoxWidthPct));
  return Math.round((frameWidth * (100 - tw)) / 200);
}

export type NewsShortSubtitleLayoutParams = {
  frameWidth?: number;
  frameHeight?: number;
  textBoxWidthPct: number;
  slideFontSize: number;
  /** Slide / template line-height (matches preview CSS on dub line). */
  lineHeight?: number;
  headline: string;
  subline: string;
  /**
   * When set, vertical safe-area uses this line count (from shared word-wrap) instead of estimating
   * from character count — keeps preview, ASS MarginV, and multi-line lift aligned.
   */
  explicitWrappedLineCount?: number;
  /** Slightly higher placement when motion runs behind transparent PNG chrome. */
  busyMotionBackdrop?: boolean;
};

export type NewsShortSubtitleLayout = {
  /**
   * ASS Alignment=2 bottom MarginV: distance from the bottom of the play-res frame
   * to the bottom of the subtitle block (same semantics as `bottom: previewBottomPct%` on the dub shell).
   */
  marginVPx: number;
  /** Percent of frame height — use on preview `style={{ bottom: \`${previewBottomPct}%\` }}`. */
  previewBottomPct: number;
  assHeadFontPx: number;
  marginLRpx: number;
  estLines: number;
};

/**
 * Predictable line-wrap count for bottom-safe stacking (headline + subline treated as one flow, like ASS).
 */
function estimateWrappedLineCount(
  fullText: string,
  usableWidthPx: number,
  assHeadFontPx: number,
): number {
  const textLen = Math.max(1, fullText.length);
  const charW = Math.max(18, assHeadFontPx * 0.5);
  const charsPerLine = Math.max(14, Math.floor(usableWidthPx / charW));
  return Math.min(5, Math.max(1, Math.ceil(textLen / charsPerLine)));
}

/**
 * Greedy word-wrap in **output space** (1080× play-res width, text box %), same char-width model as ASS burn.
 * Used for preview line breaks and explicit ASS `\\N` lines so libass does not reflow differently from the browser.
 */
export function wrapNewsShortBurnCaptionLines(
  text: string,
  opts: {
    frameWidth?: number;
    textBoxWidthPct: number;
    assHeadFontPx: number;
  },
): string[] {
  const raw = String(text ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return [];
  const W = opts.frameWidth ?? NEWS_SHORT_CANVAS_W;
  const tw = Math.min(94, Math.max(50, opts.textBoxWidthPct));
  const usableW = (W * tw) / 100;
  const charW = Math.max(18, opts.assHeadFontPx * 0.5);
  const maxChars = Math.max(14, Math.floor(usableW / charW));
  const words = raw.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur: string[] = [];

  const flush = () => {
    if (cur.length) {
      lines.push(cur.join(" "));
      cur = [];
    }
  };

  for (const w of words) {
    if (w.length > maxChars) {
      flush();
      for (let i = 0; i < w.length; i += maxChars) {
        lines.push(w.slice(i, i + maxChars));
      }
      continue;
    }
    const nextLen =
      cur.length === 0 ? w.length : cur.join(" ").length + 1 + w.length;
    if (cur.length && nextLen > maxChars) flush();
    cur.push(w);
  }
  flush();
  return lines.length ? lines : [raw];
}

/**
 * Shared bottom margin in **output pixels** (1080×1920). Preview should use `previewBottomPct`
 * so scaling the preview box keeps the same relative placement.
 */
export function computeNewsShortSubtitleLayout(
  params: NewsShortSubtitleLayoutParams,
): NewsShortSubtitleLayout {
  const W = params.frameWidth ?? NEWS_SHORT_CANVAS_W;
  const H = params.frameHeight ?? NEWS_SHORT_CANVAS_H;
  const lh = Math.max(0.85, Math.min(1.5, Number(params.lineHeight ?? 1.06) || 1.06));
  const tw = Math.min(94, Math.max(50, params.textBoxWidthPct));
  const assHeadFontPx = newsShortAssBurnHeadFontPx(params.slideFontSize);
  const headline = String(params.headline ?? "").trim();
  const subline = String(params.subline ?? "").trim();
  const full = [headline, subline].filter(Boolean).join(" ").trim();
  const usableW = (W * tw) / 100;
  const explicit = params.explicitWrappedLineCount;
  const estLines =
    explicit != null && Number.isFinite(explicit)
      ? Math.min(5, Math.max(1, Math.round(explicit)))
      : estimateWrappedLineCount(full.length ? full : " ", usableW, assHeadFontPx);
  const assLineHeightPx = Math.round(assHeadFontPx * lh);
  /** Taller blocks nudge upward so lower-third + outline stay clear of the footer bar. */
  const multiLineLift = Math.round(Math.max(0, estLines - 1) * assLineHeightPx * 0.52);
  const motionBump = params.busyMotionBackdrop ? Math.round(H * 0.012) : 0;
  let marginVPx =
    NEWS_SHORT_FOOTER_SAFE_PX + SUBTITLE_CLEARANCE_ABOVE_FOOTER_PX + multiLineLift + motionBump;
  const minV = NEWS_SHORT_FOOTER_SAFE_PX + 8;
  const maxV = Math.round(H * 0.2);
  marginVPx = Math.min(maxV, Math.max(minV, marginVPx));
  return {
    marginVPx,
    previewBottomPct: (marginVPx / H) * 100,
    assHeadFontPx,
    marginLRpx: computeNewsShortAssMarginLRpx(tw, W),
    estLines,
  };
}
