/**
 * Shared News Shorts dub / burn subtitle pipeline: one text source + wrap + bottom safe-area
 * for Content Preview and FFmpeg ASS export.
 */

import {
  computeNewsShortSubtitleLayout,
  newsShortAssBurnHeadFontPx,
  NEWS_SHORT_CANVAS_H,
  NEWS_SHORT_CANVAS_W,
  wrapNewsShortBurnCaptionLines,
} from "@/app/lib/news-short-subtitle-layout";
import { sceneSubtitleLineForBurn, splitScriptIntoSceneCaptions } from "@/app/lib/script-scene-captions";

export type NewsShortSceneSubtitlePack = {
  /** Plain dub line (before uppercase in UI / ASS). */
  displayText: string;
  /** Same wrap as ASS `\\N` lines. */
  wrappedLines: string[];
  previewBottomPct: number;
  marginVPx: number;
  assHeadFontPx: number;
};

/**
 * @param burnStyledSubtitles — `burnSubtitles && burnSubtitlesReplaceSlideText` (ASS dub path).
 */
export function buildNewsShortSceneSubtitlePack(input: {
  burnStyledSubtitles: boolean;
  voiceoverScript: string;
  sceneIndex: number;
  sceneCount: number;
  slideHeadline: string;
  slideSubline: string;
  textBoxWidthPct: number;
  slideFontSize: number;
  lineHeight?: number;
  busyMotionBackdrop: boolean;
  /** Match slide / ASS play resolution (defaults 1080×1920). */
  frameWidth?: number;
  frameHeight?: number;
}): NewsShortSceneSubtitlePack {
  const scriptTrim = input.voiceoverScript.trim();
  const chunks = splitScriptIntoSceneCaptions(input.voiceoverScript, input.sceneCount);
  const chunk = chunks[input.sceneIndex] ?? "";

  let displayText = "";
  if (input.burnStyledSubtitles) {
    if (scriptTrim) displayText = sceneSubtitleLineForBurn(chunk, input.slideHeadline, input.slideSubline);
    else displayText = [input.slideHeadline, input.slideSubline].filter(Boolean).join(". ").trim();
  } else if (scriptTrim) {
    displayText = sceneSubtitleLineForBurn(chunk, input.slideHeadline, input.slideSubline);
  } else {
    displayText = [input.slideHeadline, input.slideSubline].filter(Boolean).join(". ").trim();
  }

  const fw = input.frameWidth && input.frameWidth > 0 ? input.frameWidth : NEWS_SHORT_CANVAS_W;
  const fh = input.frameHeight && input.frameHeight > 0 ? input.frameHeight : NEWS_SHORT_CANVAS_H;
  const assHeadFontPx = newsShortAssBurnHeadFontPx(input.slideFontSize);
  const wrappedLines = wrapNewsShortBurnCaptionLines(displayText, {
    frameWidth: fw,
    textBoxWidthPct: input.textBoxWidthPct,
    assHeadFontPx: assHeadFontPx,
  });
  const lineCount = Math.max(1, wrappedLines.length);

  const layout = computeNewsShortSubtitleLayout({
    frameWidth: fw,
    frameHeight: fh,
    textBoxWidthPct: input.textBoxWidthPct,
    slideFontSize: input.slideFontSize,
    lineHeight: input.lineHeight,
    headline: displayText,
    subline: "",
    busyMotionBackdrop: input.busyMotionBackdrop,
    explicitWrappedLineCount: lineCount,
  });

  return {
    displayText,
    wrappedLines,
    previewBottomPct: layout.previewBottomPct,
    marginVPx: layout.marginVPx,
    assHeadFontPx,
  };
}
