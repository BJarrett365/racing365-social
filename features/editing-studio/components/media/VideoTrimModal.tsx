"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  initialTrimStart: number;
  initialTrimEnd: number | null;
  onSave: (trimStartSec: number, trimEndSec: number | null) => void;
  onClose: () => void;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Lightweight in/out trim (no waveform). Values are stored on the asset; export uses ffmpeg later.
 */
export function VideoTrimModal({ src, initialTrimStart, initialTrimEnd, onSave, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(0);
  const [start, setStart] = useState(initialTrimStart);
  const [end, setEnd] = useState<number | null>(initialTrimEnd);

  useEffect(() => {
    setStart(initialTrimStart);
    setEnd(initialTrimEnd);
  }, [initialTrimStart, initialTrimEnd]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) {
        setDur(d);
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [src]);

  const maxEnd = dur > 0 ? dur : 1;
  const endVal = end === null || end > maxEnd ? maxEnd : end;

  const seek = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = clamp(t, 0, maxEnd);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="video-trim-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-2xl"
        style={{ borderColor: "var(--border)" }}
      >
        <header className="flex items-start justify-between gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 id="video-trim-title" className="text-base font-bold text-[color:var(--text-primary)]">
              Trim video
            </h2>
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
              Set in and out points (seconds). Does not cut the file on disk in v1.
            </p>
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-sm text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <video ref={videoRef} src={src} className="w-full rounded-lg bg-black" controls preload="metadata" />

          {dur <= 0 ? (
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">Loading duration…</p>
          ) : null}

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
              Start (s): {start.toFixed(2)}
              <input
                type="range"
                min={0}
                max={Math.max(0, endVal - 0.1)}
                step={0.05}
                value={start}
                disabled={dur <= 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setStart(n);
                  seek(n);
                  if (end !== null && end <= n) setEnd(clamp(n + 0.1, n + 0.1, maxEnd));
                }}
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
              End (s): {endVal.toFixed(2)}
              <input
                type="range"
                min={start + 0.05}
                max={maxEnd}
                step={0.05}
                value={endVal}
                disabled={dur <= 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setEnd(n);
                  seek(n);
                }}
                className="mt-1 w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--text-primary)]">
              <input
                type="checkbox"
                disabled={dur <= 0}
                checked={end === null || endVal >= maxEnd - 0.01}
                onChange={(e) => {
                  if (e.target.checked) setEnd(null);
                  else setEnd(clamp(start + 2, start + 0.1, maxEnd));
                }}
              />
              Use full length to end
            </label>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]"
            onClick={() => {
              const outEnd = end === null || endVal >= maxEnd - 0.02 ? null : endVal;
              onSave(start, outEnd);
            }}
          >
            Apply trim
          </button>
        </footer>
      </div>
    </div>
  );
}
