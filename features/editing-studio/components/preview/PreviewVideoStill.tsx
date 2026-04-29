"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  coverSec: number;
  className?: string;
};

/** Paused video frame at ~cover time for preview thumbnails. */
export function PreviewVideoStill({ src, coverSec, className = "" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const fn = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) {
        v.currentTime = Math.min(Math.max(0, coverSec), Math.max(0, d - 0.05));
      }
    };
    v.addEventListener("loadedmetadata", fn);
    return () => v.removeEventListener("loadedmetadata", fn);
  }, [src, coverSec]);

  return <video ref={ref} src={src} className={className} muted playsInline preload="metadata" aria-hidden />;
}
