import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE, BRAND_TAGLINE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `Product · ${BRAND_SUITE}`,
  description:
    "Plexa Studio product overview: AI-native sports media production across articles, translations, shorts, social images, scripts, library assets and export.",
};

const features = [
  "Article Studio brings importing, rewriting, translation, YouTube transcripts, News Shorts and review queues into one editorial workspace.",
  "Language Studio governance manages source brands, content creators, guardrails, knowledge files, glossary, protected terms, market rules, prompt rules, quality checks and export feeds.",
  "YouTube Script Importer can use metadata, transcripts and AI output generation to turn source videos into summaries, scripts, social output and full articles.",
  "Shorts Studio remains the production hub by vertical, including horse racing, F1, TEAMtalk News and Football365 pipelines using editable tpl-... bundles.",
  "News Shorts and Social Image workflows help turn source intelligence into video/image-ready social assets, thumbnails, quote cards and captions.",
  "Library, editor and export workflows support previews, scripts, scenes, image layers, voice, subtitles, MP4 output and XML/JSON export paths.",
  "Admin-controlled API integrations include OpenAI, DeepL-ready translation workflows, Runway, ElevenLabs, Apify, YouTube/LoopFeed-style feeds and platform settings.",
  "R&D and provenance thinking is built into the product direction: licensed data, owned content, approved feeds, review state and export reliability matter as much as generation.",
];

const useCases = [
  "Turn a YouTube interview, official feed or source article into a governed article, translation, social post and short script.",
  "Help content creators build a digital footprint across text, images, audio, voice, face, video and social output without repeating manual production tasks.",
  "Use Planet Sport-owned content, licensed sports data, licensed imagery and approved feeds as trusted source intelligence for AI-assisted workflows.",
  "Route imported articles through rewrite, translation, review queue and export XML/JSON while keeping editorial governance visible.",
  "Produce daily racing tips, fast-results recaps, F1 classifications, TEAMtalk transfer content and Football365 line-ups from consistent studio workflows.",
];

export default function ProductPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{BRAND_SUITE}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Product overview</h1>
        <p className="mt-3 text-slate-400">
          {BRAND_TAGLINE}. Built as an AI-native editorial operating system for sports and publisher teams.
        </p>
      </div>

      <Panel title="What it is">
        <p className="text-sm text-slate-300">
          Plexa Studio is a production layer for AI-native sports and media teams. It turns licensed data,
          owned content, approved feeds, video transcripts and creator knowledge into governed, reusable,
          multi-format output with clear provenance. Start from{" "}
          <Link href="/article-studio" className="font-semibold text-[#22c55e] hover:underline">
            Article Studio
          </Link>{" "}
          for editorial workflows,{" "}
          <Link href="/templates" className="font-semibold text-[#22c55e] hover:underline">
            Shorts Studio
          </Link>{" "}
          for vertical video production, or{" "}
          <Link href="/tools" className="font-semibold text-[#22c55e] hover:underline">
            Tools
          </Link>{" "}
          for import and utility workflows.
        </p>
      </Panel>

      <Panel title="Core features">
        <ul className="space-y-2 text-sm text-slate-300">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Use cases">
        <ul className="space-y-2 text-sm text-slate-300">
          {useCases.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Next step">
        <p className="text-sm text-slate-300">
          Choose the studio that matches the source material: Article Studio for import, rewrite and translation;
          Tools for YouTube/script ingestion; Shorts Studio for video production; or Library for reusable assets.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/article-studio" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
            Open Article Studio
          </Link>
          <Link href="/templates" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
            Open Shorts Studio
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300"
          >
            View how it works
          </Link>
        </div>
      </Panel>
    </div>
  );
}
