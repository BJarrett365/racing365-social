import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE_UPPER, BRAND_TAGLINE } from "@/app/lib/brand";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        {BRAND_SUITE_UPPER ? (
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">
            {BRAND_SUITE_UPPER}
          </p>
        ) : null}
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">
          {BRAND_TAGLINE}
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Build short-form social video quickly with templates, AI-assisted scripting, scene rendering, and
          export-ready output.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/product" className="block transition hover:opacity-95">
          <Panel title="Product">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Overview, features and use cases</h2>
            <p className="mt-2 text-sm text-slate-400">
              Shorts hub by vertical, <code className="text-slate-600">tpl-…</code> bundles, AI scripting, library
              previews, and the full editor through to export.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#22c55e]">View product page →</span>
          </Panel>
        </Link>
        <Link href="/how-it-works" className="block transition hover:opacity-95">
          <Panel title="How It Works">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Hub, then six steps</h2>
            <p className="mt-2 text-sm text-slate-400">
              Start on Shorts (pipeline + bundle), then script, scenes, voice and subtitles, optional background
              video, preview and export.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#22c55e]">Read how it works →</span>
          </Panel>
        </Link>
        <Link href="/templates" className="block transition hover:opacity-95">
          <Panel title="Shorts">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Social video templates</h2>
            <p className="mt-2 text-sm text-slate-400">
              Horse racing, F1, TEAMtalk, Football365 — pipeline lists, create-bundle actions, muted previews, and a
              brands directory.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#eab308]">
              Open shorts →
            </span>
          </Panel>
        </Link>
        <Link href="/library" className="block transition hover:opacity-95">
          <Panel title="Library">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Output &amp; assets</h2>
            <p className="mt-2 text-sm text-slate-400">
              Manifest builds, backdrop videos, and background stills in Library images.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#22c55e]">
              Open library →
            </span>
          </Panel>
        </Link>
        <Link href="/editing-studio" className="block transition hover:opacity-95">
          <Panel title="Editing Studio">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Editorial &amp; social workflows</h2>
            <p className="mt-2 text-sm text-slate-400">
              Projects, copy, media, previews, and export — separate from templates and live streaming.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#22c55e]">Open Editing Studio →</span>
          </Panel>
        </Link>
        <Link href="/live" className="block transition hover:opacity-95">
          <Panel title="Live Control">
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Mux &amp; Restream sessions</h2>
            <p className="mt-2 text-sm text-slate-400">
              Live sessions, provider setup, ingest, and monitoring — link projects from the editor when needed.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-[#eab308]">Open Live Control →</span>
          </Panel>
        </Link>
      </div>

      <Panel title="System map">
        <ul className="grid gap-3 text-sm text-[color:var(--text-secondary)] md:grid-cols-2">
          <li>
            <span className="text-[#eab308]">Data</span> — DummyRacingDataProvider → JSON in{" "}
            <code className="text-slate-500">/data/dummy</code>
          </li>
          <li>
            <span className="text-[#eab308]">Content</span> — Captions, scenes, scripts (OpenAI stub)
          </li>
          <li>
            <span className="text-[#eab308]">Render</span> — HTML/CSS + Puppeteer → PNG
          </li>
          <li>
            <span className="text-[#eab308]">Video</span> — concat demuxer + AAC + H.264 30fps
          </li>
          <li>
            <span className="text-[#eab308]">Audio</span> — DummyAudioProvider (optional MP3 or
            generated silence)
          </li>
          <li>
            <span className="text-[#eab308]">Output</span> — <code className="text-slate-500">/output</code>{" "}
            + Library
          </li>
        </ul>
      </Panel>

      <Panel title="How it works">
        <ol className="grid gap-2 text-sm text-[color:var(--text-secondary)] sm:grid-cols-2 lg:grid-cols-3">
          <li>1. Choose a brand</li>
          <li>2. Import data or content</li>
          <li>3. Build or edit script</li>
          <li>4. Create scenes</li>
          <li>5. Add voice, subtitles and timing</li>
          <li>6. Preview and export</li>
        </ol>
      </Panel>
    </div>
  );
}
