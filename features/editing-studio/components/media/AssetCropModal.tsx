"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FocalPointPicker } from "@/features/editing-studio/components/media/FocalPointPicker";
import {
  CROP_ASPECT_PRESETS,
  aspectRatioForPreset,
  imageAspectFromNatural,
  maxCropRectForAspect,
} from "@/features/editing-studio/lib/crop-aspect-presets";
import type { CropAspectPresetId, ImageEditSettingsV1, NormalizedRect } from "@/features/editing-studio/types/image-edit";

type Props = {
  src: string;
  initial: ImageEditSettingsV1;
  onSave: (s: ImageEditSettingsV1) => void;
  onClose: () => void;
};

function clampCrop(c: NormalizedRect): NormalizedRect {
  const { w, h } = c;
  let { x, y } = c;
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  return { x, y, w, h };
}

export function AssetCropModal({ src, initial, onSave, onClose }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [settings, setSettings] = useState<ImageEditSettingsV1>(initial);
  const [mode, setMode] = useState<"crop" | "focal">("crop");

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pid: number; startClientX: number; startClientY: number; orig: NormalizedRect } | null>(
    null,
  );

  useEffect(() => {
    setSettings(initial);
  }, [initial]);

  const applyPreset = useCallback(
    (preset: CropAspectPresetId, focal = settings.focalPoint) => {
      if (!natural) {
        setSettings((s) => ({ ...s, aspectPreset: preset }));
        return;
      }
      const imgAspect = imageAspectFromNatural(natural.w, natural.h);
      const target = aspectRatioForPreset(preset);
      const crop = maxCropRectForAspect(imgAspect, target, focal);
      setSettings((s) => ({ ...s, aspectPreset: preset, crop }));
    },
    [natural, settings.focalPoint],
  );

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    if (w <= 0 || h <= 0) return;
    setNatural({ w, h });
    const imgAspect = imageAspectFromNatural(w, h);
    const target = aspectRatioForPreset(initial.aspectPreset);
    const crop = maxCropRectForAspect(imgAspect, target, initial.focalPoint);
    setSettings((s) => ({ ...s, crop }));
  };

  const onCropPointerDown = (e: React.PointerEvent) => {
    if (mode !== "crop") return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pid: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      orig: { ...settings.crop },
    };
  };

  const onCropPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pid !== e.pointerId) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const dx = (e.clientX - d.startClientX) / r.width;
    const dy = (e.clientY - d.startClientY) / r.height;
    setSettings((s) => ({
      ...s,
      crop: clampCrop({ ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy }),
    }));
  };

  const onCropPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pid !== e.pointerId) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  const aspectDisabled = !natural;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="asset-crop-modal-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-2xl"
        style={{ borderColor: "var(--border)" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 id="asset-crop-modal-title" className="text-base font-bold text-[color:var(--text-primary)]">
              Crop & focal
            </h2>
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
              Drag the frame to recompose. Switch to focal to set the attention point for blur and positioning.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {CROP_ASPECT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={aspectDisabled}
                onClick={() => applyPreset(p.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  settings.aspectPreset === p.id
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--text-primary)]"
                    : "border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                } disabled:opacity-40`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("crop")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                mode === "crop" ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]" : "border text-[color:var(--text-secondary)]"
              }`}
              style={mode === "crop" ? undefined : { borderColor: "var(--border)" }}
            >
              Move crop
            </button>
            <button
              type="button"
              onClick={() => setMode("focal")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                mode === "focal" ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]" : "border text-[color:var(--text-secondary)]"
              }`}
              style={mode === "focal" ? undefined : { borderColor: "var(--border)" }}
            >
              Set focal point
            </button>
            <button
              type="button"
              disabled={!natural}
              onClick={() => applyPreset(settings.aspectPreset, settings.focalPoint)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              Reset crop to preset
            </button>
          </div>

          <div ref={wrapRef} className="relative mx-auto mt-4 w-full max-w-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-auto w-full rounded-lg"
              onLoad={onImgLoad}
              draggable={false}
            />
            <div className="absolute inset-0 rounded-lg ring-1 ring-white/10" />

            <div
              className={`absolute rounded-md border-2 border-amber-400 bg-amber-400/10 shadow-lg ${
                mode === "crop" ? "cursor-move" : "pointer-events-none opacity-80"
              }`}
              style={{
                left: `${settings.crop.x * 100}%`,
                top: `${settings.crop.y * 100}%`,
                width: `${settings.crop.w * 100}%`,
                height: `${settings.crop.h * 100}%`,
                zIndex: mode === "crop" ? 30 : 10,
              }}
              onPointerDown={onCropPointerDown}
              onPointerMove={onCropPointerMove}
              onPointerUp={onCropPointerUp}
              onPointerCancel={onCropPointerUp}
            />

            <FocalPointPicker
              value={settings.focalPoint}
              onChange={(fp) => setSettings((s) => ({ ...s, focalPoint: fp }))}
              disabled={mode !== "focal"}
              className="absolute inset-0 z-20 rounded-lg"
              label="Set focal point"
            />
          </div>

          {!natural ? <p className="mt-2 text-xs text-[color:var(--text-muted)]">Loading image dimensions…</p> : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]"
            style={{ borderColor: "var(--border)" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]"
            onClick={() => onSave(settings)}
          >
            Apply crop & focal
          </button>
        </footer>
      </div>
    </div>
  );
}
