/** Client-side scene compositor — rasterised to PNG and merged under template text in Puppeteer. */

export type CompositorAnimPreset = "none" | "pulse" | "fade-in" | "slide-up" | "slide-left" | "zoom-in";

export type CompositorLayerBase = {
  id: string;
  visible: boolean;
  z: number;
  x: number;
  y: number;
  opacity: number;
  rotationDeg: number;
  /** Preview-only pulse in the editor; export uses current phase (static frame). */
  animPreset?: CompositorAnimPreset;
  /** Motion timing metadata stored with layer settings. */
  animDurationSec?: number;
  animDelaySec?: number;
};

export type CompositorTextLayer = CompositorLayerBase & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  align: CanvasTextAlign;
  lineHeight: number;
  letterSpacing: number;
  shadowBlur: number;
  shadowColor: string;
};

export type CompositorShapeLayer = CompositorLayerBase & {
  type: "rect" | "ellipse";
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
};

export type CompositorPatternLayer = CompositorLayerBase & {
  type: "pattern";
  pattern: "stripes" | "dots" | "grid" | "diagonal";
  w: number;
  h: number;
  colorA: string;
  colorB: string;
  cellSize: number;
};

export type CompositorLayer = CompositorTextLayer | CompositorShapeLayer | CompositorPatternLayer;

export const COMPOSITOR_CANVAS_W = 1080;
export const COMPOSITOR_CANVAS_H = 1920;

export const FONT_PRESETS = [
  { id: "ui-sans", label: "UI Sans", value: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif' },
  { id: "georgia", label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { id: "impact", label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { id: "arial-black", label: "Arial Black", value: '"Arial Black", Arial, sans-serif' },
] as const;

export function newLayerId(): string {
  return `ly-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultTextLayer(): CompositorTextLayer {
  return {
    id: newLayerId(),
    type: "text",
    visible: true,
    z: 1,
    x: 80,
    y: 200,
    opacity: 1,
    rotationDeg: 0,
    text: "Your headline",
    fontSize: 72,
    fontFamily: FONT_PRESETS[0].value,
    color: "#ffffff",
    fontWeight: "700",
    align: "left",
    lineHeight: 1.15,
    letterSpacing: 0,
    shadowBlur: 0,
    shadowColor: "rgba(0,0,0,0.6)",
    animPreset: "none",
    animDurationSec: 0.7,
    animDelaySec: 0,
  };
}

export function defaultRectLayer(): CompositorShapeLayer {
  return {
    id: newLayerId(),
    type: "rect",
    visible: true,
    z: 0,
    x: 0,
    y: 0,
    opacity: 0.35,
    rotationDeg: 0,
    w: 1080,
    h: 600,
    fill: "#0f1812",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    animPreset: "none",
    animDurationSec: 0.7,
    animDelaySec: 0,
  };
}

export function defaultEllipseLayer(): CompositorShapeLayer {
  return {
    id: newLayerId(),
    type: "ellipse",
    visible: true,
    z: 0,
    x: 400,
    y: 800,
    opacity: 0.5,
    rotationDeg: 0,
    w: 400,
    h: 400,
    fill: "#22c55e",
    stroke: "#eab308",
    strokeWidth: 4,
    cornerRadius: 0,
    animPreset: "none",
    animDurationSec: 0.7,
    animDelaySec: 0,
  };
}

export function defaultPatternLayer(): CompositorPatternLayer {
  return {
    id: newLayerId(),
    type: "pattern",
    visible: true,
    z: 0,
    x: 0,
    y: 0,
    opacity: 0.2,
    rotationDeg: 0,
    pattern: "diagonal",
    w: 1080,
    h: 1920,
    colorA: "#1a1a1a",
    colorB: "#2d4a38",
    cellSize: 24,
    animPreset: "none",
    animDurationSec: 0.7,
    animDelaySec: 0,
  };
}
