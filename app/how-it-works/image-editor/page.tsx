import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `Image Editor · How it works · ${BRAND_SUITE}`,
  description: "How the Planet Sport Studio Image Editor (layers) works: scenes, overlays, controls, and preview.",
};

const workflowSteps = [
  {
    title: "Open the editor",
    body: "From any template (e.g. Next off, Fast results), open the editor for your content. In the right column, expand Image editor (layers).",
  },
  {
    title: "Pick a scene",
    body: "Use the scene tabs (intro, tips, outro, etc.) to switch slides. Each scene has its own layer stack — edits on one scene do not overwrite another.",
  },
  {
    title: "See template data underneath",
    body: "After you run Update Preview or Apply Changes, the frame shows your template output (headlines, odds, branding) as an underlay. Your layers draw on top of that — you are customising overlays, not replacing the feed-driven template text unless you add your own text layers.",
  },
  {
    title: "Add and select layers",
    body: "Use Add Text, Add Shape, or Add Pattern to create layers. Click a layer on the stage to select it — you will see a highlight and resize handles. The layer list below the preview shows every layer; use visibility and order controls there.",
  },
  {
    title: "Move and resize",
    body: "Drag a selected layer to reposition it. Drag corner handles to resize. Text resize adjusts font size so type stays crisp. The editor can snap toward the vertical and horizontal centre while you drag.",
  },
  {
    title: "Edit text inline",
    body: "Double-click a text layer to type directly on the canvas. For fine control, use the Layer Controls panel on the right: font, size, weight, colour, line height, letter spacing, and alignment.",
  },
  {
    title: "Layer Controls",
    body: "The right-hand Layer Controls panel updates for the selected layer: position (X, Y), size where relevant, rotation, opacity, and type-specific options (fill, stroke, pattern). Motion lets you pick a preview animation, duration, and delay — stored with the layer for future video export.",
  },
  {
    title: "Update Preview vs Apply Changes",
    body: "Both actions refresh the rendered PNGs from the server so Content preview and exports match your layers. Save layers stores the stack in this browser session; Apply Changes / Update Preview bakes layers into the scene images used for build and library.",
  },
];

export default function ImageEditorHowItWorksPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{BRAND_SUITE}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">How the Image Editor works</h1>
        <p className="mt-3 text-slate-400">
          The Image Editor is a visual layer stack for each scene: you design overlays on a 1080×1920 canvas, preview
          motion, then bake the result into your rendered frames.
        </p>
      </div>

      <Panel title="At a glance">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>
            <strong className="text-slate-200">One stack per scene</strong> — switch tabs to edit intro, tips, or outro
            separately.
          </li>
          <li>
            <strong className="text-slate-200">Template underlay + layers</strong> — feed-driven artwork appears behind
            your compositor; your shapes and text sit on top.
          </li>
          <li>
            <strong className="text-slate-200">Click, drag, resize</strong> — direct manipulation on the stage plus a
            structured Layer Controls panel.
          </li>
          <li>
            <strong className="text-slate-200">Preview motion</strong> — animation presets run in the editor; export
            still uses a raster snapshot unless the video pipeline reads motion metadata later.
          </li>
        </ul>
      </Panel>

      <Panel title="Step by step">
        <ol className="space-y-4">
          {workflowSteps.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">
                Step {i + 1} — {s.title}
              </p>
              <p className="mt-2 text-sm text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Tips">
        <ul className="space-y-2 text-sm text-slate-300">
          <li>Use Save layers if you want to persist the stack in the browser before navigating away.</li>
          <li>
            Fast-results-only shortcuts (Intro / Winner / Placings / Outro template presets) appear only for that
            format; other templates use Add Text / Shape / Pattern and Top bar.
          </li>
          <li>
            If the underlay looks stale after changing template data, use Apply Changes so PNGs regenerate from the
            latest feed and layers.
          </li>
        </ul>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link href="/how-it-works" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black">
          Back to How it works
        </Link>
        <Link href="/templates" className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300">
          Open templates
        </Link>
      </div>
    </div>
  );
}
