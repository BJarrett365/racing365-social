"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import {
  fastIntroStackLayers,
  fastOutroStackLayers,
  fastPlacingsStackLayers,
  fastWinnerStackLayers,
  topAccentBarLayers,
} from "@/app/lib/compositor-presets";
import type {
  CompositorAnimPreset,
  CompositorLayer,
  CompositorShapeLayer,
  CompositorTextLayer,
} from "@/app/lib/compositor-types";
import {
  COMPOSITOR_CANVAS_H,
  COMPOSITOR_CANVAS_W,
  FONT_PRESETS,
  defaultPatternLayer,
  defaultRectLayer,
  defaultTextLayer,
} from "@/app/lib/compositor-types";
import { R365Button } from "@/app/components/R365Button";
import { sceneDisplayLabel } from "@/app/lib/scene-display-labels";
import type { ContentFormat } from "@/types";

type Props = {
  layers: CompositorLayer[];
  onLayersChange: (next: CompositorLayer[]) => void;
  sceneId?: string | null;
  sceneOptions?: { id: string; label?: string }[];
  onSceneChange?: (id: string) => void;
  onSaveLayers?: () => void;
  onRenderScenes?: () => void;
  renderBusy?: boolean;
  /** When set (e.g. fast-results), winner/placings preset buttons use Board 1 / Board 2. */
  contentFormat?: ContentFormat | null;
  /** Raster of template + feed data only (no compositor PNG) — aligned under the layer canvas after Render scenes */
  templateUnderlaySrc?: string;
};

type Bounds = { x: number; y: number; w: number; h: number };
type ResizeHandle = "nw" | "ne" | "sw" | "se";

function layerLabel(l: CompositorLayer, i: number): string {
  if (l.type === "text") return `Text ${i + 1}`;
  if (l.type === "pattern") return `Pattern (${l.pattern})`;
  return l.type === "rect" ? `Shape ${i + 1}` : `Ellipse ${i + 1}`;
}

function maxZ(layers: CompositorLayer[]): number {
  return layers.reduce((m, l) => Math.max(m, l.z), 0);
}

/** Full-scene presets replace the stack so Intro + Winner + Placings are not drawn on top of each other. */
function replaceWithPreset(
  onLayersChange: (next: CompositorLayer[]) => void,
  getPreset: () => CompositorLayer[],
) {
  onLayersChange(getPreset());
}

/** Small accent (e.g. top bar) stacks on the current design. */
function appendPresetStack(
  layers: CompositorLayer[],
  onLayersChange: (next: CompositorLayer[]) => void,
  getPreset: () => CompositorLayer[],
) {
  const b = maxZ(layers);
  const extra = getPreset().map((l, i) => ({ ...l, z: b + i + 1 }));
  onLayersChange([...layers, ...extra]);
}

function textBounds(layer: CompositorTextLayer): Bounds {
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const ctx = canvas?.getContext("2d");
  if (!ctx) return { x: layer.x, y: layer.y, w: 240, h: layer.fontSize * 2 };
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  const lines = layer.text.split("\n");
  const spacing = layer.letterSpacing ?? 0;
  const w = Math.max(
    80,
    ...lines.map((line) => {
      if (Math.abs(spacing) < 0.01) return ctx.measureText(line).width;
      return line.split("").reduce((acc, ch) => acc + ctx.measureText(ch).width + spacing, 0);
    }),
  );
  const h = Math.max(layer.fontSize * 1.2, lines.length * layer.fontSize * (layer.lineHeight ?? 1.15));
  return { x: layer.x, y: layer.y, w, h };
}

function layerBounds(layer: CompositorLayer): Bounds {
  if (layer.type === "text") return textBounds(layer);
  return { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
}

function motionStyle(layer: CompositorLayer): CSSProperties {
  const d = Math.max(0.3, Math.min(2, layer.animDurationSec ?? 0.7));
  const delay = Math.max(0, layer.animDelaySec ?? 0);
  const base: CSSProperties = { animationDuration: `${d}s`, animationDelay: `${delay}s`, animationFillMode: "both" };
  switch (layer.animPreset) {
    case "fade-in":
      return { ...base, animationName: "r365-fade-in" };
    case "slide-up":
      return { ...base, animationName: "r365-slide-up" };
    case "slide-left":
      return { ...base, animationName: "r365-slide-left" };
    case "zoom-in":
      return { ...base, animationName: "r365-zoom-in" };
    case "pulse":
      return { ...base, animationName: "r365-pulse", animationIterationCount: "infinite" };
    default:
      return {};
  }
}

export function SceneImageEditor({
  layers,
  onLayersChange,
  sceneId = null,
  sceneOptions = [],
  onSceneChange,
  onSaveLayers,
  onRenderScenes,
  renderBusy = false,
  contentFormat = null,
  templateUnderlaySrc,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    mode: "drag" | "resize";
    layerId: string;
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    bounds: Bounds;
  } | null>(null);

  const showFastScenePresets = contentFormat === "fast-results";
  const winnerPresetLabel =
    contentFormat === "fast-results" ? sceneDisplayLabel(contentFormat, "winner") : "Winner";
  const placingsPresetLabel =
    contentFormat === "fast-results" ? sceneDisplayLabel(contentFormat, "placings") : "Placings";
  const scale = 280 / COMPOSITOR_CANVAS_H;
  const stageW = Math.round(COMPOSITOR_CANVAS_W * scale);
  const stageH = Math.round(COMPOSITOR_CANVAS_H * scale);

  const selected = useMemo(
    () => layers.find((l) => l.id === selectedId) ?? null,
    [layers, selectedId],
  );

  useEffect(() => {
    setSelectedId((cur) => {
      if (cur && layers.some((l) => l.id === cur)) return cur;
      if (layers.length) return layers[layers.length - 1]!.id;
      return null;
    });
  }, [layers, sceneId]);

  const patchSelected = (patch: Partial<CompositorLayer>) => {
    if (!selected) return;
    onLayersChange(
      layers.map((l) => (l.id === selected.id ? ({ ...l, ...patch } as CompositorLayer) : l)),
    );
  };

  const patchText = (patch: Partial<CompositorTextLayer>) => {
    if (!selected || selected.type !== "text") return;
    patchSelected(patch);
  };

  const patchShape = (patch: Partial<CompositorShapeLayer>) => {
    if (!selected || (selected.type !== "rect" && selected.type !== "ellipse")) return;
    patchSelected(patch);
  };

  const patchById = useCallback((id: string, patch: Partial<CompositorLayer>) => {
    onLayersChange(layers.map((l) => (l.id === id ? ({ ...l, ...patch } as CompositorLayer) : l)));
  }, [layers, onLayersChange]);

  const addLayer = (layer: CompositorLayer) => {
    const nz = maxZ(layers) + 1;
    onLayersChange([...layers, { ...layer, z: nz }]);
    setSelectedId(layer.id);
  };

  const removeLayer = (id: string) => {
    onLayersChange(layers.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveZ = (id: string, delta: number) => {
    const sorted = [...layers].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const j = idx + delta;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[j]!;
    onLayersChange(
      layers.map((l) => {
        if (l.id === a.id) return { ...l, z: b.z };
        if (l.id === b.id) return { ...l, z: a.z };
        return l;
      }),
    );
  };

  const sortedForList = useMemo(() => [...layers].sort((a, b) => b.z - a.z), [layers]);
  const visibleLayers = useMemo(() => [...layers].filter((l) => l.visible).sort((a, b) => a.z - b.z), [layers]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const it = interactionRef.current;
      if (!it || !stageRef.current) return;
      const dx = (e.clientX - it.startX) / scale;
      const dy = (e.clientY - it.startY) / scale;
      const nx = it.bounds.x + dx;
      const ny = it.bounds.y + dy;
      if (it.mode === "drag") {
        const snapX = Math.abs(nx + it.bounds.w / 2 - COMPOSITOR_CANVAS_W / 2) < 12 ? COMPOSITOR_CANVAS_W / 2 - it.bounds.w / 2 : nx;
        const snapY = Math.abs(ny + it.bounds.h / 2 - COMPOSITOR_CANVAS_H / 2) < 12 ? COMPOSITOR_CANVAS_H / 2 - it.bounds.h / 2 : ny;
        setGuides({
          x: snapX !== nx ? COMPOSITOR_CANVAS_W / 2 : undefined,
          y: snapY !== ny ? COMPOSITOR_CANVAS_H / 2 : undefined,
        });
        patchById(it.layerId, { x: snapX, y: snapY });
      } else {
        const handle = it.handle ?? "se";
        let x = it.bounds.x;
        let y = it.bounds.y;
        let w = Math.max(24, it.bounds.w);
        let h = Math.max(24, it.bounds.h);
        if (handle.includes("e")) w = Math.max(24, it.bounds.w + dx);
        if (handle.includes("s")) h = Math.max(24, it.bounds.h + dy);
        if (handle.includes("w")) {
          x = it.bounds.x + dx;
          w = Math.max(24, it.bounds.w - dx);
        }
        if (handle.includes("n")) {
          y = it.bounds.y + dy;
          h = Math.max(24, it.bounds.h - dy);
        }
        const target = layers.find((l) => l.id === it.layerId);
        if (!target) return;
        if (target.type === "text") {
          const ratio = w / Math.max(48, it.bounds.w);
          patchById(it.layerId, { x, y, fontSize: Math.max(10, Math.round(target.fontSize * ratio)) } as Partial<CompositorTextLayer>);
        } else {
          patchById(it.layerId, { x, y, w, h } as Partial<CompositorShapeLayer>);
        }
      }
    };
    const onUp = () => {
      interactionRef.current = null;
      setGuides({});
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [layers, patchById, scale]);

  const startDrag = (e: ReactMouseEvent, layer: CompositorLayer) => {
    if (editingTextId && editingTextId === layer.id) return;
    e.preventDefault();
    setSelectedId(layer.id);
    interactionRef.current = {
      mode: "drag",
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      bounds: layerBounds(layer),
    };
  };

  const startResize = (e: ReactMouseEvent, layer: CompositorLayer, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(layer.id);
    interactionRef.current = {
      mode: "resize",
      layerId: layer.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      bounds: layerBounds(layer),
    };
  };

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes r365-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes r365-slide-up { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes r365-slide-left { from { opacity: 0; transform: translateX(18px);} to { opacity: 1; transform: translateX(0);} }
        @keyframes r365-zoom-in { from { opacity: 0; transform: scale(0.92);} to { opacity: 1; transform: scale(1);} }
        @keyframes r365-pulse { 0% { opacity: .8; } 50% { opacity: 1;} 100% { opacity: .8;} }
      `}</style>
      <p className="text-[11px] text-slate-600 leading-relaxed">
        Raster layers (1080×1920) bake into a PNG and sit <strong className="text-slate-400">between</strong> the
        backdrop dim and template text when you Render scenes. Animation presets are preview-only; export is a
        still frame. Scene tabs switch which slide you are editing.{" "}
        {showFastScenePresets ? (
          <>
            <strong className="text-slate-400">
              Intro / {winnerPresetLabel} / {placingsPresetLabel} / Outro
            </strong>{" "}
            below replace this scene’s layers (Fast results placeholders).{" "}
            <strong className="text-slate-400">Top bar</strong> adds on top.
          </>
        ) : (
          <>
            Use <strong className="text-slate-400">+ Text</strong> / shapes to add overlays, or{" "}
            <strong className="text-slate-400">Top bar</strong> for the accent strip. Fast-results layout presets
            are hidden here so labels match your template (e.g. Next off tips).
          </>
        )}{" "}
        Then <strong className="text-slate-400">Render scenes</strong> so the Content preview matches this scene.
      </p>

      {sceneOptions.length > 0 && onSceneChange && (
        <div className="flex flex-wrap gap-1.5 border-b border-[#1f2d26] pb-2" role="tablist" aria-label="Compositor scene">
          {sceneOptions.map((o) => {
            const active = o.id === sceneId;
            return (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSceneChange(o.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-mono transition-colors ${
                  active
                    ? "bg-[#eab308] text-black"
                    : "border border-slate-600/60 bg-black/30 text-slate-400 hover:text-slate-200"
                }`}
              >
                {o.label ?? o.id}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onSaveLayers && (
          <R365Button type="button" variant="ghost" onClick={onSaveLayers}>
            Save layers
          </R365Button>
        )}
        {onRenderScenes && (
          <R365Button type="button" onClick={onRenderScenes} disabled={renderBusy}>
            {renderBusy ? "Updating…" : "Update Preview"}
          </R365Button>
        )}
        {onRenderScenes && (
          <R365Button type="button" variant="ghost" onClick={onRenderScenes} disabled={renderBusy}>
            Apply Changes
          </R365Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultTextLayer())}>
          T Add Text
        </R365Button>
        <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultRectLayer())}>
          S Add Shape
        </R365Button>
        <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultPatternLayer())}>
          P Add Pattern
        </R365Button>
        <span title="Coming soon">
          <R365Button type="button" variant="ghost" disabled>
            L Add Logo
          </R365Button>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase text-slate-600">
          {showFastScenePresets ? "Scene templates (replace)" : "Layer actions"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {showFastScenePresets ? (
            <>
              <R365Button
                type="button"
                variant="ghost"
                onClick={() => replaceWithPreset(onLayersChange, fastIntroStackLayers)}
              >
                Intro
              </R365Button>
              <R365Button
                type="button"
                variant="ghost"
                onClick={() => replaceWithPreset(onLayersChange, fastWinnerStackLayers)}
              >
                {winnerPresetLabel}
              </R365Button>
              <R365Button
                type="button"
                variant="ghost"
                onClick={() => replaceWithPreset(onLayersChange, fastPlacingsStackLayers)}
              >
                {placingsPresetLabel}
              </R365Button>
              <R365Button
                type="button"
                variant="ghost"
                onClick={() => replaceWithPreset(onLayersChange, fastOutroStackLayers)}
              >
                Outro
              </R365Button>
            </>
          ) : null}
          <span title="Adds yellow/green strip above current layers">
            <R365Button
              type="button"
              variant="ghost"
              onClick={() => appendPresetStack(layers, onLayersChange, topAccentBarLayers)}
            >
              Top bar
            </R365Button>
          </span>
          <R365Button
            type="button"
            variant="ghost"
            onClick={() => {
              onLayersChange([]);
              setSelectedId(null);
            }}
          >
            Clear all
          </R365Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
      <div className="rounded-lg border border-[#1f2d26] bg-black p-2 flex justify-center">
        <div
          ref={stageRef}
          className={`relative inline-block ${templateUnderlaySrc ? "overflow-hidden rounded border border-[#1f2d26]" : ""}`}
          style={{ width: stageW, height: stageH }}
        >
          {templateUnderlaySrc ? (
            <Image
              src={templateUnderlaySrc}
              alt=""
              width={COMPOSITOR_CANVAS_W}
              height={COMPOSITOR_CANVAS_H}
              unoptimized
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full object-contain"
              style={{ aspectRatio: `${COMPOSITOR_CANVAS_W} / ${COMPOSITOR_CANVAS_H}` }}
            />
          ) : null}
          {!templateUnderlaySrc ? <div className="absolute inset-0 rounded border border-[#1f2d26]" /> : null}
          {visibleLayers.map((layer) => {
            const b = layerBounds(layer);
            const selected = layer.id === selectedId;
            const common: CSSProperties = {
              position: "absolute",
              left: b.x * scale,
              top: b.y * scale,
              width: b.w * scale,
              height: b.h * scale,
              transform: `rotate(${layer.rotationDeg}deg)`,
              transformOrigin: "top left",
              opacity: layer.opacity,
              zIndex: layer.z + 20,
              ...motionStyle(layer),
            };
            return (
              <div
                key={layer.id}
                style={common}
                onMouseDown={(e) => startDrag(e, layer)}
                onDoubleClick={() => {
                  if (layer.type === "text") setEditingTextId(layer.id);
                }}
                className={`group cursor-move ${selected ? "ring-2 ring-[#22d3ee]" : "hover:ring-1 hover:ring-slate-500/60"}`}
              >
                {layer.type === "text" ? (
                  <div
                    contentEditable={editingTextId === layer.id}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      setEditingTextId(null);
                      patchById(layer.id, { text: e.currentTarget.innerText } as Partial<CompositorTextLayer>);
                    }}
                    style={{
                      color: layer.color,
                      fontSize: Math.max(10, layer.fontSize * scale),
                      fontFamily: layer.fontFamily,
                      fontWeight: layer.fontWeight as CSSProperties["fontWeight"],
                      textAlign: layer.align as CSSProperties["textAlign"],
                      lineHeight: layer.lineHeight,
                      letterSpacing: `${(layer.letterSpacing ?? 0) * scale}px`,
                      textShadow: layer.shadowBlur > 0 ? `2px 2px ${layer.shadowBlur * scale}px ${layer.shadowColor}` : "none",
                      width: "100%",
                      height: "100%",
                      outline: "none",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {layer.text}
                  </div>
                ) : layer.type === "pattern" ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background:
                        layer.pattern === "dots"
                          ? `radial-gradient(${layer.colorB} 20%, ${layer.colorA} 21%) 0 0 / ${Math.max(6, layer.cellSize * scale)}px ${Math.max(6, layer.cellSize * scale)}px`
                          : layer.pattern === "grid"
                            ? `linear-gradient(${layer.colorB} 1px, transparent 1px), linear-gradient(90deg, ${layer.colorB} 1px, ${layer.colorA} 1px)`
                            : `repeating-linear-gradient(45deg, ${layer.colorA}, ${layer.colorA} 8px, ${layer.colorB} 8px, ${layer.colorB} 16px)`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: layer.fill,
                      border: layer.strokeWidth > 0 ? `${layer.strokeWidth * scale}px solid ${layer.stroke}` : "none",
                      borderRadius: layer.type === "ellipse" ? "999px" : `${layer.cornerRadius * scale}px`,
                    }}
                  />
                )}
                {selected ? (
                  <>
                    {(["nw", "ne", "sw", "se"] as ResizeHandle[]).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onMouseDown={(e) => startResize(e, layer, h)}
                        className="absolute h-3 w-3 rounded-full border border-black bg-[#22d3ee]"
                        style={{
                          left: h.includes("w") ? -6 : undefined,
                          right: h.includes("e") ? -6 : undefined,
                          top: h.includes("n") ? -6 : undefined,
                          bottom: h.includes("s") ? -6 : undefined,
                        }}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            );
          })}
          {guides.x != null ? <div className="absolute top-0 h-full w-px bg-[#22d3ee]/70" style={{ left: guides.x * scale }} /> : null}
          {guides.y != null ? <div className="absolute left-0 w-full h-px bg-[#22d3ee]/70" style={{ top: guides.y * scale }} /> : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Layers</p>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          Template text (course, time, tips) is rendered from feed data — not a layer here. Add overlays below; they
          bake into the compositor PNG on Update Preview.
        </p>
        {templateUnderlaySrc ? (
          <div className="mt-2 flex items-center gap-2 rounded border border-dashed border-[#1f2d26] bg-black/40 px-2 py-2 text-[11px] text-slate-500">
            <span className="text-[#eab308]/80">○</span>
            <span className="flex-1 truncate">Template output (underlay)</span>
            <span className="shrink-0 rounded bg-[#1f2d26] px-1.5 py-0.5 text-[10px] text-slate-400">locked</span>
          </div>
        ) : null}
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
          {sortedForList.length === 0 ? (
            <p className="text-xs text-slate-500">No compositor layers yet.</p>
          ) : null}
          {sortedForList.map((l, idx) => (
            <div
              key={l.id}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                selectedId === l.id ? "bg-[#1f2d26] ring-1 ring-[#eab308]/40" : "bg-black/40"
              }`}
            >
              <input
                type="checkbox"
                checked={l.visible}
                onChange={() => onLayersChange(layers.map((x) => (x.id === l.id ? { ...x, visible: !x.visible } : x)))}
                aria-label="Visible"
              />
              <button
                type="button"
                className="flex-1 text-left truncate text-slate-300 hover:text-white"
                onClick={() => setSelectedId(l.id)}
              >
                <span className="font-mono text-[#eab308]/80">z{l.z}</span> {layerLabel(l, idx)}
              </button>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-300"
                onClick={() => moveZ(l.id, -1)}
                title="Send backward"
              >
                ↓
              </button>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-300"
                onClick={() => moveZ(l.id, 1)}
                title="Bring forward"
              >
                ↑
              </button>
              <button
                type="button"
                className="text-red-400/80 hover:text-red-400"
                onClick={() => removeLayer(l.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultTextLayer())}>
            + Text
          </R365Button>
          <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultRectLayer())}>
            + Shape
          </R365Button>
          <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultPatternLayer())}>
            + Pattern
          </R365Button>
        </div>
      </div>

      <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 text-xs space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Layer Controls</p>
        {selected ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-slate-500">X<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={Math.round(selected.x)} onChange={(e) => patchSelected({ x: Number(e.target.value) || 0 })} /></label>
              <label className="text-slate-500">Y<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={Math.round(selected.y)} onChange={(e) => patchSelected({ y: Number(e.target.value) || 0 })} /></label>
              {"w" in selected ? <label className="text-slate-500">W<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={Math.round(selected.w)} onChange={(e) => patchSelected({ w: Math.max(1, Number(e.target.value) || 1) } as Partial<CompositorShapeLayer>)} /></label> : null}
              {"h" in selected ? <label className="text-slate-500">H<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={Math.round(selected.h)} onChange={(e) => patchSelected({ h: Math.max(1, Number(e.target.value) || 1) } as Partial<CompositorShapeLayer>)} /></label> : null}
              <label className="text-slate-500">Rotation<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.rotationDeg} onChange={(e) => patchSelected({ rotationDeg: Number(e.target.value) || 0 })} /></label>
              <label className="text-slate-500">Opacity<input type="number" min={0} max={1} step={0.05} className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.opacity} onChange={(e) => patchSelected({ opacity: Math.max(0, Math.min(1, Number(e.target.value) || 0)) })} /></label>
            </div>
            {selected.type === "text" ? (
              <>
                <label className="block text-slate-500">Font family
                  <select className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={FONT_PRESETS.find((f) => f.value === selected.fontFamily)?.id ?? FONT_PRESETS[0].id} onChange={(e) => { const fp = FONT_PRESETS.find((f) => f.id === e.target.value); if (fp) patchText({ fontFamily: fp.value }); }}>
                    {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </label>
                <label className="block text-slate-500">Font size
                  <input type="range" min={10} max={220} value={selected.fontSize} onChange={(e) => patchText({ fontSize: Number(e.target.value) })} className="mt-1 w-full" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-slate-500">Weight<select className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.fontWeight} onChange={(e) => patchText({ fontWeight: e.target.value })}><option value="400">400</option><option value="600">600</option><option value="700">700</option><option value="800">800</option><option value="900">900</option></select></label>
                  <label className="text-slate-500">Colour<input type="color" className="mt-1 h-9 w-full rounded border border-[#1f2d26] bg-black" value={selected.color.slice(0, 7)} onChange={(e) => patchText({ color: e.target.value })} /></label>
                  <label className="text-slate-500">Align<select className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.align} onChange={(e) => patchText({ align: e.target.value as CanvasTextAlign })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
                  <label className="text-slate-500">Line height<input type="number" step={0.05} className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.lineHeight ?? 1.15} onChange={(e) => patchText({ lineHeight: Math.max(0.7, Number(e.target.value) || 1.15) })} /></label>
                  <label className="text-slate-500 col-span-2">Letter spacing<input type="number" step={0.5} className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.letterSpacing ?? 0} onChange={(e) => patchText({ letterSpacing: Number(e.target.value) || 0 })} /></label>
                </div>
              </>
            ) : null}
            {(selected.type === "rect" || selected.type === "ellipse") ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-slate-500">Fill<input type="color" className="mt-1 h-9 w-full rounded border border-[#1f2d26] bg-black" value={selected.fill.slice(0, 7)} onChange={(e) => patchShape({ fill: e.target.value })} /></label>
                <label className="text-slate-500">Border<input type="color" className="mt-1 h-9 w-full rounded border border-[#1f2d26] bg-black" value={selected.stroke.startsWith("#") ? selected.stroke.slice(0, 7) : "#000000"} onChange={(e) => patchShape({ stroke: e.target.value })} /></label>
                <label className="text-slate-500">Border width<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.strokeWidth} onChange={(e) => patchShape({ strokeWidth: Math.max(0, Number(e.target.value) || 0) })} /></label>
                <label className="text-slate-500">Radius<input type="number" className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.cornerRadius} onChange={(e) => patchShape({ cornerRadius: Math.max(0, Number(e.target.value) || 0) })} /></label>
              </div>
            ) : null}
            <div className="border-t border-[#1f2d26] pt-2 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Motion</p>
              <label className="block text-slate-500">Animation
                <select className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.animPreset ?? "none"} onChange={(e) => patchSelected({ animPreset: e.target.value as CompositorAnimPreset })}>
                  <option value="none">None</option><option value="fade-in">Fade in</option><option value="slide-up">Slide up</option><option value="slide-left">Slide left</option><option value="zoom-in">Zoom in</option><option value="pulse">Pulse</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-slate-500">Duration (s)<input type="number" min={0.3} max={2} step={0.1} className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.animDurationSec ?? 0.7} onChange={(e) => patchSelected({ animDurationSec: Math.max(0.3, Math.min(2, Number(e.target.value) || 0.7)) })} /></label>
                <label className="text-slate-500">Delay (s)<input type="number" min={0} max={2} step={0.1} className="mt-1 w-full rounded border border-[#1f2d26] bg-black px-2 py-1 text-white" value={selected.animDelaySec ?? 0} onChange={(e) => patchSelected({ animDelaySec: Math.max(0, Number(e.target.value) || 0) })} /></label>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Select a layer in the list above, or add one. Feed-driven text (e.g. Ascot, 15:10) is not editable here —
              change it under <strong className="text-slate-300">Template data</strong>, then Update Preview.
            </p>
            <div className="flex flex-col gap-2">
              <div className="w-full [&_button]:w-full">
                <R365Button type="button" variant="primary" onClick={() => addLayer(defaultTextLayer())}>
                  Add Text layer
                </R365Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultRectLayer())}>
                  Add Shape
                </R365Button>
                <R365Button type="button" variant="ghost" onClick={() => addLayer(defaultPatternLayer())}>
                  Add Pattern
                </R365Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      </div>

    </div>
  );
}
