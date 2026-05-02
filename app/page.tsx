import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE_UPPER } from "@/app/lib/brand";

const primaryCards = [
  {
    title: "Shorts Studio",
    href: "/templates",
    heading: "Portrait social video templates",
    description: "Build short-form clips from racing, football, F1 and sport-specific template bundles.",
    cta: "Open Shorts Studio",
    accent: "gold",
  },
  {
    title: "Landscape Studio",
    href: "/landscape",
    heading: "Landscape video workflows",
    description: "Create wider-format editorial and social video outputs for desktop and platform publishing.",
    cta: "Open Landscape Studio",
    accent: "green",
  },
  {
    title: "Article Studio",
    href: "/article-studio",
    heading: "Import, rewrite, translate and review",
    description: "Bring article imports, YouTube transcripts, rewrites, translations and review into one hub.",
    cta: "Open Article Studio",
    accent: "gold",
  },
  {
    title: "Language Studio",
    href: "/language-studio",
    heading: "Translation, localisation and export",
    description: "Run source imports, rewrites, translations, governance checks and XML/JSON exports.",
    cta: "Open Language Studio",
    accent: "green",
  },
  {
    title: "Podcast Studio",
    href: "/podcast-template",
    heading: "Podcast script builder",
    description: "Shape articles, notes and transcripts into podcast-ready scripts and formats.",
    cta: "Open Podcast Studio",
    accent: "green",
  },
  {
    title: "Audio Studio",
    href: "/audio-studio",
    heading: "Notes, transcription, TTS and voice workflows",
    description: "Record, upload, transcribe, translate and create reusable voice assets with OpenAI and ElevenLabs.",
    cta: "Open Audio Studio",
    accent: "gold",
  },
  {
    title: "Tools",
    href: "/tools",
    heading: "Utility hub",
    description: "Access YouTube importing, URL-to-article workflows, export tools and creator utilities.",
    cta: "Open Tools",
    accent: "green",
  },
  {
    title: "Library",
    href: "/library",
    heading: "Assets and generated outputs",
    description: "Review saved images, videos, manifests, source media and reusable creative assets.",
    cta: "Open Library",
    accent: "gold",
  },
  {
    title: "Schedule Studio",
    href: "/editing-studio",
    heading: "Editorial scheduling and social workflow",
    description: "Manage projects, copy, media, previews and export-ready schedule items.",
    cta: "Coming soon",
    accent: "muted",
    status: "Coming soon",
  },
  {
    title: "Live Control",
    href: "/live",
    heading: "Mux and Restream sessions",
    description: "Create, monitor and manage live sessions with provider setup and ingest controls.",
    cta: "Coming soon",
    accent: "muted",
    status: "Coming soon",
  },
];

const supportCards = [
  { title: "Product", href: "/product", description: "Overview, features and use cases." },
  { title: "How It Works", href: "/how-it-works", description: "Step-by-step workflow guide." },
  { title: "Guard Rails", href: "/guard-rails", description: "Editorial and safety boundaries." },
  { title: "Brand Guidelines", href: "/brand-guidelines", description: "Plexa Studio visual and tone guidance." },
  { title: "Prompts", href: "/prompts", description: "Prompt library and AI instructions." },
  { title: "Admin", href: "/admin", description: "Settings, integrations and keys." },
];

const newsShortsCards = [
  {
    title: "News Shorts (Planet Sport)",
    href: "/news-shorts",
    heading: "Video and social images from article content",
    description:
      "Create Planet Sport news-led short videos, quote cards, thumbnails and social images from article scripts and editorial assets.",
    cta: "Open News Shorts",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="max-w-3xl">
        {BRAND_SUITE_UPPER ? (
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">
            {BRAND_SUITE_UPPER}
          </p>
        ) : null}
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">
          Plexa Studio Control Room
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Create short videos, social images, captions, articles and multilingual outputs from one AI-powered
          production hub. Choose a studio, shape the story, then publish or export with the right assets ready.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {primaryCards.map((card) => (
          <Link key={card.title} href={card.href} className="block transition hover:-translate-y-0.5 hover:opacity-95">
            <Panel title={card.status ?? card.title}>
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-[color:var(--text-primary)]">{card.title}</h2>
                  {card.status ? (
                    <span className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                      {card.status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-secondary)]">{card.heading}</p>
                <p className="mt-2 flex-1 text-sm leading-6 text-[color:var(--text-muted)]">{card.description}</p>
                <span className={`mt-6 inline-flex text-sm font-semibold ${card.accent === "muted" ? "text-[color:var(--text-secondary)]" : card.accent === "gold" ? "text-[#eab308]" : "text-[#22c55e]"}`}>
                  {card.cta} →
                </span>
              </div>
            </Panel>
          </Link>
        ))}
      </div>

      <Panel title="News Shorts & Social Image">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {newsShortsCards.map((card) => (
            <Link key={card.title} href={card.href} className="block rounded-xl border border-[#1f2d26] bg-black/20 p-4 transition hover:border-[#22c55e]/60">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)]">{card.title}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-300">{card.heading}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
              <span className="mt-6 inline-flex text-sm font-semibold text-[#22c55e]">{card.cta} →</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Support">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {supportCards.map((card) => (
            <Link key={card.title} href={card.href} className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 transition hover:border-[#22c55e]/60">
              <p className="text-sm font-bold text-[color:var(--text-primary)]">{card.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
