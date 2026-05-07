import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";

const tools = [
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
    name: "Image Generator",
    description: "Generate images for editorial and social workflows.",
    href: "/tools",
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

    </div>
  );
}
