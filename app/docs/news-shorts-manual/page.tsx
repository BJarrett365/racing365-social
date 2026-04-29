import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "News Shorts manual",
  description: "Operator guide: source, render, build, and export for vertical news shorts.",
};

const img = (name: string, alt: string, caption: string) => (
  <figure className="my-8 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
    <div className="relative aspect-[16/9] w-full bg-slate-950">
      <Image
        src={`/docs/news-shorts/${name}`}
        alt={alt}
        fill
        className="object-contain"
        sizes="(max-width: 896px) 100vw, 896px"
        priority={name.includes("01-")}
      />
    </div>
    <figcaption className="border-t border-slate-700 px-4 py-3 text-sm text-slate-400">{caption}</figcaption>
  </figure>
);

export default function NewsShortsManualPage() {
  return (
    <article className="prose prose-invert prose-slate mx-auto max-w-3xl pb-16 prose-headings:font-bold prose-a:text-[#86efac] prose-a:no-underline hover:prose-a:underline">
      <p className="text-sm text-slate-500">
        <Link href="/news-shorts" className="text-[#86efac]">
          ← Back to News Shorts
        </Link>
      </p>
      <h1 className="text-3xl font-black tracking-tight text-white">News Shorts — Operator Manual</h1>
      <p className="lead text-slate-300">
        How the vertical 9:16 builder works: source → edit → render PNGs → build MP4, with optional motion layers,
        voiceover, subtitles, and SEO export.
      </p>

      <h2>Visual tour</h2>
      <p>
        The builder is organised in columns: <strong>source and actions</strong> on the left, long-form controls in
        the centre, and <strong>content preview</strong> plus <strong>video</strong> on the right (wide layouts).
      </p>

      {img(
        "news-shorts-01-source-actions.png",
        "News Shorts source type and Actions steps: Parse, Render, Build",
        "Source type (article URL or RSS), then the three primary actions: Fetch + Parse, Render scenes, and Build video. Audio and motion hints update based on your selections.",
      )}

      {img(
        "news-shorts-02-content-preview.png",
        "Content preview with 9:16 slide and slide list",
        "Content preview mirrors slide styling (approximate to server PNGs). Use the slide list to switch scenes; edit copy and motion in the main editor area.",
      )}

      {img(
        "news-shorts-03-video-build.png",
        "Video panel with player and download controls",
        "After a successful build, the Video panel shows the MP4 preview. Download uses the SEO-friendly filename when configured; engine JSON is available from the build summary.",
      )}

      <h2>Pipeline (summary)</h2>
      <ol>
        <li>
          <strong>Parse</strong> — <code>POST /api/news-shorts/parse</code> fetches HTML/RSS and returns template JSON.
        </li>
        <li>
          <strong>Render</strong> — Puppeteer turns each slide HTML template into <code>output/images/&#123;contentId&#125;/</code>{" "}
          PNGs.
        </li>
        <li>
          <strong>Build</strong> — FFmpeg composites PNGs, optional video/image layers, audio (TTS / voice / clip), and
          burned subtitles → <code>output/video/&#123;contentId&#125;-short.mp4</code>.
        </li>
      </ol>

      <h2>Documentation source</h2>
      <p>
        The full Markdown manual (API tables, data model, operational requirements) lives in the repository at{" "}
        <code className="text-slate-300">docs/news-shorts-manual.md</code>. This page highlights the UI; the file
        contains the complete technical reference.
      </p>
    </article>
  );
}
