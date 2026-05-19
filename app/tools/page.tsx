import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

type ToolCard = {
  name: string;
  description: string;
  href: string;
  status: string;
};

const importTools: ToolCard[] = [
  {
    name: "RSS Import Builder",
    description:
      "Crawl RSS/Atom feeds into Supabase, apply filters, bundle feeds, and copy stable RSS/JSON URLs for Language Studio imports.",
    href: "/tools/rss-import-builder",
    status: "Live",
  },
  {
    name: "YouTube Script Importer",
    description:
      "Paste a YouTube URL, import or paste a transcript, then turn it into scripts, summaries, subtitles, podcast scripts, Shorts scripts and translations.",
    href: "/tools/youtube-script-importer",
    status: "Live",
  },
  {
    name: "URL to Article",
    description: "Import article URLs and turn them into source material for rewrite, translation and review.",
    href: "/language-studio?tab=Imports",
    status: "Live",
  },
];

const studioTools: ToolCard[] = [
  {
    name: "Loop Feed teams",
    description:
      "Save each club’s Loop topic content URL once. Data Studio uses Side A / Side B dropdowns for match-day social context in reports.",
    href: "/tools/loop-feed-teams",
    status: "Live",
  },
  {
    name: "Loop Feed priority reporters",
    description:
      "Per-sport list of trusted handles, Loop topics, and notes (e.g. transfers). Data Studio folds these into AI previews and reports.",
    href: "/tools/loop-feed-priority-reporters",
    status: "Live",
  },
  {
    name: "Data Studio",
    description:
      "Multi-sport data hub: fixture feeds (rolling out per vertical), match-report workflow entry, and a learning library for sites, brands and article styles.",
    href: "/data-studio",
    status: "Live",
  },
  {
    name: "Image Editor",
    description:
      "Canvas-first editing in the browser: brightness, contrast, saturation, rotate, flip, crop, export PNG — optional Higgsfield AI assist below the fold.",
    href: "/tools/image-editor",
    status: "Live",
  },
  {
    name: "YouTube Video Download",
    description: "Download permitted YouTube source videos for owned or licensed workflows.",
    href: "/tools",
    status: "Coming soon",
  },
  {
    name: "Podcast Script Builder",
    description: "Shape notes, articles and transcripts into podcast-ready dialogue scripts.",
    href: "/podcast-template",
    status: "Coming soon",
  },
  {
    name: "Language Studio",
    description: "Translate, localise, rewrite and export multilingual sports content.",
    href: "/language-studio",
    status: "Live",
  },
  {
    name: "Subtitle / SRT Generator",
    description: "Create subtitle files from transcript text and timed segments.",
    href: "/tools/youtube-script-importer",
    status: "Coming soon",
  },
  {
    name: "Quote Clip Finder",
    description: "Find quote-led clips with suggested captions and timestamps.",
    href: "/tools/youtube-script-importer",
    status: "Coming soon",
  },
  {
    name: "Video Resizer",
    description: "Prepare source videos for platform-specific sizes and formats.",
    href: "/tools",
    status: "Coming soon",
  },
  {
    name: "Export Hub",
    description: "Package approved outputs for XML, JSON, social, CMS and client delivery.",
    href: "/language-studio?tab=Export%20Feeds",
    status: "Live",
  },
];

function ToolGrid({ tools }: { tools: ToolCard[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => {
        const isLive = tool.status === "Live";
        return (
          <Panel key={tool.name} title={tool.status}>
            <div className="flex h-full min-h-[190px] flex-col gap-5">
              <div className="flex-1">
                <h2 className="text-xl font-black tracking-tight text-[color:var(--text-primary)]">{tool.name}</h2>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">{tool.description}</p>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4">
                <span
                  className={
                    isLive
                      ? "rounded-full border border-emerald-500/40 bg-emerald-500/12 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-100"
                      : "rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[color:var(--text-secondary)]"
                  }
                >
                  {tool.status}
                </span>
                {isLive ? (
                  <Link href={tool.href}>
                    <R365Button>Open</R365Button>
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-muted)]">
                    Planned
                  </span>
                )}
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Tools</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">
          Planet Sport Studio utility hub
        </h1>
        <p className="mt-4 text-lg leading-7 text-[color:var(--text-secondary)]">
          Import, convert and prepare content for Planet Sport Studio projects without changing the existing template flows.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">Import</h2>
        <ToolGrid tools={importTools} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)]">Studio utilities</h2>
        <ToolGrid tools={studioTools} />
      </section>
    </div>
  );
}
