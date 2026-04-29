import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE, BRAND_TAGLINE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `How It Works · ${BRAND_SUITE}`,
  description:
    "How PLEXA works: Shorts hub, tpl-… bundles, then script → scenes → audio → export.",
};

const steps = [
  "Shorts hub — pick a vertical and pipeline (or open an existing tpl-… item)",
  "Import data or content (fixtures, grids, dummy JSON, or pasted copy)",
  "Build or edit the script (AI-assisted, format-aware)",
  "Create and tune scenes (render, image editor, layers)",
  "Add voice, subtitles, timing — and optional background video where available",
  "Preview and export Shorts MP4 to the library",
];

const benefits = [
  "Start from a single hub that lists every live pipeline instead of hunting URLs.",
  "Faster production from idea to publish-ready short.",
  "One workflow across horse racing, F1, TEAMtalk, Football365, and future brands.",
  "Consistent output with shorts, prompts, and optional brand guidelines.",
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{BRAND_SUITE}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">How it works</h1>
        <p className="mt-3 text-slate-400">
          {BRAND_TAGLINE}. Use the{" "}
          <Link href="/templates" className="font-semibold text-[#22c55e] hover:underline">
            Shorts
          </Link>{" "}
          hub to choose a format, then run the same editor workflow for every short.
        </p>
      </div>

      <Panel title="Shorts hub (start here)">
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <span className="text-[#eab308]">Browse by vertical</span> — Horse racing, F1, TEAMtalk, and Football365
            each expose concrete pipelines (e.g. next off, fast results, racecards; F1 grid and results; news and
            line-ups).
          </li>
          <li>
            <span className="text-[#eab308]">Open a list</span> — Each card links to the template list for that
            pipeline. From there you open an existing <code className="text-slate-500">tpl-…</code> bundle or create a
            new one.
          </li>
          <li>
            <span className="text-[#eab308]">Previews</span> — Cards can show a muted loop from your latest library
            output for that format, or a checked-in example clip when present.
          </li>
          <li>
            <span className="text-[#eab308]">Brands</span> — The directory at the bottom of the page shows which
            properties already have pipelines and which are marked coming soon.
          </li>
        </ul>
        <Link
          href="/templates"
          className="mt-4 inline-flex rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black hover:opacity-95"
        >
          Open Shorts hub →
        </Link>
      </Panel>

      <Panel title="Editor workflow (6 steps)">
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
        <Link href="/templates" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
          Open shorts
        </Link>
        <Link href="/" className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
