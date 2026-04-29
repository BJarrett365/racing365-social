"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  /** Duration in seconds (from parent video metadata). */
  durationSec: number;
  coverFrameSec: number;
  onCoverChange: (sec: number) => void;
  className?: string;
};

/**
 * Scrub + pick poster time for cover frame (stored as seconds; raster export is backend v2).
 */
export function FrameSelector({ src, durationSec, coverFrameSec, onCoverChange, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(durationSec);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) setDur(d);
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    v.currentTime = Math.min(coverFrameSec, v.duration);
  }, [coverFrameSec, dur, src]);

  const max = dur > 0 ? dur : Math.max(durationSec, 1);

  const seek = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(max, t));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Cover frame</p>
      <video ref={videoRef} src={src} className="w-full max-w-md rounded-lg bg-black" muted playsInline preload="metadata" />
      <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
        Frame time: {coverFrameSec.toFixed(2)}s
        <input
          type="range"
          min={0}
          max={max}
          step={0.04}
          value={Math.min(coverFrameSec, max)}
          onChange={(e) => {
            const t = Number(e.target.value);
            onCoverChange(t);
            seek(t);
          }}
          className="mt-1 w-full"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
          style={{ borderColor: "var(--border)" }}
          onClick={() => {
            const v = videoRef.current;
            if (v) onCoverChange(v.currentTime);
          }}
        >
          Use current frame
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
          style={{ borderColor: "var(--border)" }}
          onClick={() => onCoverChange(0)}
        >
          First frame
        </button>
      </div>
    </div>
  );
}
