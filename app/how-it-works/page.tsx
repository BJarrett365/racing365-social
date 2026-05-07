import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE, BRAND_TAGLINE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `How It Works · ${BRAND_SUITE}`,
  description:
    "How Planet Sport Studio works: source intelligence, Article Studio, Language Studio, Shorts Studio, social image, review and export.",
};

const steps = [
  "Start with trusted source intelligence: licensed data, owned content, approved XML/RSS feeds, YouTube/LoopFeed inputs, or library assets.",
  "Import into Article Studio, Language Studio, YouTube Script Importer, News Shorts, Shorts Studio or the Library depending on the workflow.",
  "Use AI to rewrite, translate, summarise, generate article drafts, create social output, find quotes, build scripts or repair quality issues.",
  "Review the output with source material, rights/provenance context, content creator style, guardrails, protected terms and quality checks visible.",
  "Create multi-format assets: articles, translations, captions, social images, thumbnails, shorts scripts, voiceover, scenes and export feeds.",
  "Approve and export to XML/JSON, MP4, library assets or downstream platform workflows, keeping evidence of changes, failures and barriers.",
];

const benefits = [
  "Reduce manual production effort so content creators can focus on expertise, opinion, analysis and personality.",
  "Use one governed workflow across articles, translations, social images, shorts, audio/video scripts and exports.",
  "Keep licensed data, owned content, approved feeds and external inputs separated by source and rights status.",
  "Use failures, rejected outputs, parser errors and manual barriers as R&D evidence and product-learning signals.",
  "Build a reusable digital footprint for creators across text, audio, images, voice, face, video and social platforms.",
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{BRAND_SUITE}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">How it works</h1>
        <p className="mt-3 text-slate-400">
          {BRAND_TAGLINE}. Planet Sport Studio turns approved source intelligence into governed, reusable output across
          articles, translations, social images, shorts, audio/video scripts and exports. Start from{" "}
          <Link href="/article-studio" className="font-semibold text-[#22c55e] hover:underline">
            Article Studio
          </Link>{" "}
          or open the studio that matches the job.
        </p>
      </div>

      <Panel title="Studio flow">
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <span className="text-[#eab308]">Article Studio</span> — Import articles, rewrite articles, translate
            articles, manage YouTube transcripts, create News Shorts and move work into the review queue.
          </li>
          <li>
            <span className="text-[#eab308]">Language Studio</span> — Apply source brands, content creator styles,
            guardrails, knowledge files, glossary, protected terms, market rules and export feeds.
          </li>
          <li>
            <span className="text-[#eab308]">Tools</span> — Use the YouTube Script Importer and future utilities for
            source ingestion, scripts, captions, summaries and article generation.
          </li>
          <li>
            <span className="text-[#eab308]">Shorts Studio</span> — Browse vertical pipelines, open or create{" "}
            <code className="text-slate-500">tpl-...</code> bundles, then build scenes, voice, subtitles and MP4
            output.
          </li>
          <li>
            <span className="text-[#eab308]">R&D reports</span> — Admin includes internal reports that explain the
            technical direction, barriers, failures and evidence to keep.
          </li>
        </ul>
        <Link
          href="/article-studio"
          className="mt-4 inline-flex rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black hover:opacity-95"
        >
          Open Article Studio →
        </Link>
      </Panel>

      <Panel title="Workflow (6 steps)">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">Step {i + 1}</p>
              <p className="mt-1 text-sm text-slate-200">{step}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Benefits">
        <ul className="space-y-2 text-sm text-slate-300">
          {benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="R&D learning loop">
        <p className="text-sm text-slate-300">
          R&D is not always about successful outputs. Planet Sport Studio should keep learning from the failures and
          barriers: malformed feeds, transcript gaps, model hallucinations, prompt failures, missing rights metadata,
          export errors, slow workflows and manual production steps that block content creators from being creative.
        </p>
      </Panel>

      <Panel title="Image Editor (layers)">
        <p className="text-sm text-slate-300">
          Scene tabs, template underlays, draggable layers, Layer Controls, motion, and preview updates — how they fit
          together inside the editor after you open a template.
        </p>
        <Link
          href="/how-it-works/image-editor"
          className="mt-4 inline-flex rounded-md border border-[#1f2d26] bg-[#0a0e0c] px-4 py-2 text-sm font-semibold text-[#eab308] hover:border-[#eab308]/40"
        >
          How the Image Editor works →
        </Link>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link href="/article-studio" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
          Open Article Studio
        </Link>
        <Link href="/templates" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
          Open Shorts Studio
        </Link>
        <Link href="/admin/reports" className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300">
          View R&D reports
        </Link>
        <Link href="/" className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
