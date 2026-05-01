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
          Plexa utility hub
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Import, convert and prepare content for Plexa projects without changing the existing template flows.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Panel key={tool.name} title={tool.status}>
            <div className="flex h-full flex-col gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">{tool.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{tool.description}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={
                    tool.status === "Live"
                      ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-300"
                      : "rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-400"
                  }
                >
                  {tool.status}
                </span>
                <Link href={tool.href}>
                  <R365Button variant={tool.status === "Live" ? "primary" : "ghost"}>
                    {tool.status === "Live" ? "Open" : "View"}
                  </R365Button>
                </Link>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
