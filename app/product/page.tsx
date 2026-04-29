import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE, BRAND_TAGLINE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `Product · ${BRAND_SUITE}`,
  description:
    "PLEXA product overview: shorts hub by vertical, tpl-… bundles, AI scripting, editor, and export.",
};

const features = [
  "Shorts hub organised by vertical — horse racing (next off, fast results, racecards), F1 (grid, results), TEAMtalk News, and Football365 line-ups — each linking to a pipeline list.",
  "Create new Shorts bundles from any supported format with one click; everything is stored as editable tpl-… template IDs.",
  "Template cards show optional video previews: latest matching output from your library, or a local example MP4 under public/templates/examples/.",
  "Brands directory (PlanetF1, Football365, TEAMtalk, Racing365, and more) surfaces what is live today and what is coming next.",
  "AI script tooling and prompts with format-aware guard rails; brand guidelines where configured.",
  "One editor for scene rendering, image layers, subtitles, timing, voice preview, and export-ready Shorts MP4.",
];

const useCases = [
  "Daily racing tips, fast-results recaps, and racecard boards from the same horse-racing pipelines.",
  "F1 grid and race-classification shorts in portrait 1080×1350 with consistent branding.",
  "TEAMtalk-style transfer and news bars; Football365 pitch line-ups and bench views.",
  "Multi-brand teams routing work through the hub while keeping output consistent.",
];

export default function ProductPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{BRAND_SUITE}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Product overview</h1>
        <p className="mt-3 text-slate-400">{BRAND_TAGLINE}. Built for fast, consistent social video production.</p>
      </div>

      <Panel title="What it is">
        <p className="text-sm text-slate-300">
          PLEXA is a production workspace for short-form editorial video. The{" "}
          <Link href="/templates" className="font-semibold text-[#22c55e] hover:underline">
            Shorts
          </Link>{" "}
          hub is the front door: pick a vertical, open the pipeline list, then create or reopen a{" "}
          <code className="text-slate-500">tpl-…</code> bundle. From there you generate scripts, refine scenes,
          add voice and subtitles, and export publish-ready Shorts — with one consistent path from idea to MP4.
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
          Open the hub to choose a pipeline, create a template bundle if you need a fresh ID, then follow the
          workflow to produce and export your next short.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/templates" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
            Open shorts
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
