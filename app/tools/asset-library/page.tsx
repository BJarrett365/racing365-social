"use client";

import Link from "next/link";
import { LibraryTextToImagePanel } from "@/app/library/LibraryTextToImagePanel";
import { LibraryUploadImagePanel } from "@/app/library/LibraryUploadImagePanel";

export default function AssetLibraryToolsPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Tools</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">Asset library</h1>
        <p className="mt-4 text-lg leading-7 text-[color:var(--text-secondary)]">
          Upload stills or generate new images into the shared <strong className="text-[color:var(--text-primary)]">Library</strong>{" "}
          (same paths as Language Studio, News Shorts backdrops, and Shorts editors).
        </p>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          <Link href="/library?tab=libraryImages" className="font-semibold text-[#86efac] underline hover:text-[#bbf7d0]">
            Browse Library images →
          </Link>
        </p>
      </div>

      <LibraryUploadImagePanel />
      <LibraryTextToImagePanel panelTitle="Text to image" />
    </div>
  );
}
