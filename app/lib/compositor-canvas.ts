import type { CompositorLayer, CompositorPatternLayer, CompositorShapeLayer, CompositorTextLayer } from "./compositor-types";
import { COMPOSITOR_CANVAS_H, COMPOSITOR_CANVAS_W } from "./compositor-types";

function sortedLayers(layers: CompositorLayer[]): CompositorLayer[] {
  return [...layers].filter((l) => l.visible).sort((a, b) => a.z - b.z);
}

function motionOpacity(layer: CompositorLayer, animPhase: number): number {
  if (layer.animPreset === "pulse") return layer.opacity * (0.85 + 0.15 * Math.sin(animPhase));
  if (layer.animPreset === "fade-in") {
    const t = 0.5 + 0.5 * Math.sin(animPhase * 0.6);
    return layer.opacity * Math.max(0.2, t);
  }
  return layer.opacity;
}

function makePatternCanvas(p: CompositorPatternLayer): HTMLCanvasElement {
  const cell = Math.max(4, p.cellSize);
  const c = document.createElement("canvas");
  c.width = cell * 2;
  c.height = cell * 2;
  const g = c.getContext("2d")!;
  g.fillStyle = p.colorA;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = p.colorB;
  if (p.pattern === "dots") {
    g.beginPath();
    g.arc(cell / 2, cell / 2, cell / 5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(cell * 1.5, cell * 1.5, cell / 5, 0, Math.PI * 2);
    g.fill();
  } else if (p.pattern === "grid") {
    g.strokeStyle = p.colorB;
    g.lineWidth = 1;
    g.strokeRect(0, 0, cell, cell);
    g.strokeRect(cell, cell, cell, cell);
  } else if (p.pattern === "stripes") {
    g.strokeStyle = p.colorB;
    g.lineWidth = cell / 6;
    for (let i = -c.width; i < c.width * 2; i += cell / 2) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + c.height, c.height);
      g.stroke();
    }
  } else {
    /* diagonal blocks */
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(cell, 0);
    g.lineTo(0, cell);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(cell, cell);
    g.lineTo(cell * 2, cell);
    g.lineTo(cell, cell * 2);
    g.closePath();
    g.fill();
  }
  return c;
}

function drawPattern(ctx: CanvasRenderingContext2D, layer: CompositorPatternLayer, animPhase: number) {
  const op = motionOpacity(layer, animPhase);
  ctx.save();
  ctx.globalAlpha = op;
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotationDeg * Math.PI) / 180);
  const patCanvas = makePatternCanvas(layer);
  const pat = ctx.createPattern(patCanvas, "repeat");
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, layer.w, layer.h);
  }
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, layer: CompositorShapeLayer, animPhase: number) {
  const op = motionOpacity(layer, animPhase);
  ctx.save();
  ctx.globalAlpha = op;
  ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
  ctx.rotate((layer.rotationDeg * Math.PI) / 180);
  ctx.translate(-layer.w / 2, -layer.h / 2);
  ctx.fillStyle = layer.fill;
  if (layer.strokeWidth > 0 && layer.stroke !== "transparent") {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth;
  }
  if (layer.type === "rect") {
    const r = Math.min(layer.cornerRadius, layer.w / 2, layer.h / 2);
    if (r > 0) {
      ctx.beginPath();
      const x = 0,
        y = 0,
        w = layer.w,
        h = layer.h;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      if (layer.strokeWidth > 0) ctx.stroke();
    } else {
      ctx.fillRect(0, 0, layer.w, layer.h);
      if (layer.strokeWidth > 0) ctx.strokeRect(0, 0, layer.w, layer.h);
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(layer.w / 2, layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (layer.strokeWidth > 0) ctx.stroke();
  }
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, layer: CompositorTextLayer, animPhase: number) {
  const op = motionOpacity(layer, animPhase);
  ctx.save();
  ctx.globalAlpha = op;
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotationDeg * Math.PI) / 180);
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.fillStyle = layer.color;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "top";
  if (layer.shadowBlur > 0) {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }
  const lines = layer.text.split("\n");
  let dy = 0;
  const lh = layer.fontSize * (layer.lineHeight ?? 1.15);
  const letterSpacing = layer.letterSpacing ?? 0;
  for (const line of lines) {
    if (Math.abs(letterSpacing) < 0.01) {
      ctx.fillText(line, 0, dy);
    } else {
      let dx = 0;
      for (const ch of line) {
        ctx.fillText(ch, dx, dy);
        dx += ctx.measureText(ch).width + letterSpacing;
      }
    }
    dy += lh;
  }
  ctx.restore();
}

/** Draw layers onto an existing canvas (browser only). */
export function drawCompositorLayers(
  canvas: HTMLCanvasElement,
  layers: CompositorLayer[],
  animPhase = 0,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (canvas.width !== COMPOSITOR_CANVAS_W) canvas.width = COMPOSITOR_CANVAS_W;
  if (canvas.height !== COMPOSITOR_CANVAS_H) canvas.height = COMPOSITOR_CANVAS_H;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const layer of sortedLayers(layers)) {
    if (layer.type === "pattern") drawPattern(ctx, layer, animPhase);
    else if (layer.type === "rect" || layer.type === "ellipse") drawShape(ctx, layer as CompositorShapeLayer, animPhase);
    else if (layer.type === "text") drawText(ctx, layer, animPhase);
  }
}

/**
 * Drops text layers that match legacy fast-results editor labels ("Board 1", "BOARD 2", …).
 * Those were scene markers in the UI; they were often left in the layer stack and baked into PNG previews.
 */
export function stripLegacyFastResultsBoardOverlayLayers(layers: CompositorLayer[]): CompositorLayer[] {
  return layers.filter((l) => {
    if (l.type !== "text") return true;
    const normalized = l.text.trim().replace(/\s+/g, " ");
    if (!normalized) return true;
    return !/^board \d+$/i.test(normalized);
  });
}

/** Rasterise layers to a PNG data URL (browser only). */
export function compositorLayersToDataUrl(
  layers: CompositorLayer[],
  animPhase = 0,
): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = COMPOSITOR_CANVAS_W;
  canvas.height = COMPOSITOR_CANVAS_H;
  drawCompositorLayers(canvas, layers, animPhase);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
