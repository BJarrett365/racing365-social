import { BRAND_HORSE_RACING_FULL_RESULTS } from "@/app/lib/brand";
import type { CompositorLayer } from "@/app/lib/compositor-types";
import {
  COMPOSITOR_CANVAS_H,
  COMPOSITOR_CANVAS_W,
  defaultPatternLayer,
  defaultTextLayer,
  defaultRectLayer,
  newLayerId,
} from "@/app/lib/compositor-types";

/** Full-bleed subtle pattern behind template copy */
function basePatternLayer(z: number): CompositorLayer {
  return {
    ...defaultPatternLayer(),
    id: newLayerId(),
    z,
    opacity: 0.12,
    pattern: "diagonal",
    w: COMPOSITOR_CANVAS_W,
    h: COMPOSITOR_CANVAS_H,
    colorA: "#0a0e0c",
    colorB: "#1e3d2a",
  };
}

/** Preset stacks for fast-results–style Shorts (1080×1920). Add onto current stack. */

export function fastIntroStackLayers(): CompositorLayer[] {
  const z0 = 0;
  return [
    basePatternLayer(z0),
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 1,
      x: 72,
      y: 620,
      text: "FAST RESULTS",
      fontSize: 26,
      fontWeight: "800",
      color: "#cbd5e1",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 2,
      x: 72,
      y: 700,
      text: "Newmarket",
      fontSize: 78,
      fontWeight: "800",
      color: "#ffffff",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 3,
      x: 72,
      y: 820,
      text: "14:25",
      fontSize: 64,
      fontWeight: "800",
      color: "#22c55e",
      align: "left",
    },
  ];
}

export function fastWinnerStackLayers(): CompositorLayer[] {
  const z0 = 0;
  return [
    basePatternLayer(z0),
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 1,
      x: 72,
      y: 1180,
      text: "Northern Lights",
      fontSize: 86,
      fontWeight: "800",
      color: "#ffffff",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 2,
      x: 72,
      y: 1290,
      text: "SP 5/2",
      fontSize: 64,
      fontWeight: "800",
      color: "#22c55e",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 3,
      x: 72,
      y: 1380,
      text: "Newmarket",
      fontSize: 30,
      fontWeight: "500",
      color: "#64748b",
      align: "left",
    },
  ];
}

export function fastPlacingsStackLayers(): CompositorLayer[] {
  const z0 = 0;
  return [
    basePatternLayer(z0),
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 1,
      x: 72,
      y: 420,
      text: "1. Northern Lights  5/2",
      fontSize: 36,
      fontWeight: "700",
      color: "#f8fafc",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 2,
      x: 72,
      y: 500,
      text: "2. Eclipse Boy  7/1",
      fontSize: 36,
      fontWeight: "700",
      color: "#e2e8f0",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 3,
      x: 72,
      y: 580,
      text: "3. Silver Fern  11/2",
      fontSize: 36,
      fontWeight: "700",
      color: "#e2e8f0",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 4,
      x: 72,
      y: 660,
      text: "4. Dawn Patrol  14/1",
      fontSize: 36,
      fontWeight: "700",
      color: "#e2e8f0",
      align: "left",
    },
  ];
}

export function fastOutroStackLayers(): CompositorLayer[] {
  const z0 = 0;
  return [
    basePatternLayer(z0),
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 1,
      x: 72,
      y: 780,
      text: "STAY CLOSE",
      fontSize: 28,
      fontWeight: "800",
      color: "#cbd5e1",
      align: "left",
    },
    {
      ...defaultTextLayer(),
      id: newLayerId(),
      z: z0 + 2,
      x: 72,
      y: 860,
      text: BRAND_HORSE_RACING_FULL_RESULTS,
      fontSize: 56,
      fontWeight: "800",
      color: "#eab308",
      align: "left",
    },
  ];
}

export function topAccentBarLayers(): CompositorLayer[] {
  return [
    {
      ...defaultRectLayer(),
      id: newLayerId(),
      z: 1,
      x: 0,
      y: 0,
      w: COMPOSITOR_CANVAS_W / 2,
      h: 8,
      opacity: 1,
      fill: "#eab308",
      stroke: "transparent",
      strokeWidth: 0,
      cornerRadius: 0,
    },
    {
      ...defaultRectLayer(),
      id: newLayerId(),
      z: 2,
      x: COMPOSITOR_CANVAS_W / 2,
      y: 0,
      w: COMPOSITOR_CANVAS_W / 2,
      h: 8,
      opacity: 1,
      fill: "#22c55e",
      stroke: "transparent",
      strokeWidth: 0,
      cornerRadius: 0,
    },
  ];
}
