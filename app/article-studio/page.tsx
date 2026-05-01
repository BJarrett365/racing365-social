import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Article Studio · ${BRAND_SUITE}`,
};

const articleWorkflows = [
  {
    title: "Import Articles",
    status: "Live",
    href: "/language-studio?tab=Imports",
    description:
      "Bring in XML, RSS, URL, API and HTML page sources before rewriting, translating or moving articles to review.",
  },
  {
    title: "Rewrite Articles",
    status: "Live",
    href: "/language-studio?tab=Rewrite",
    description:
      "Rewrite imported articles and YouTube transcript source material with content style, sport, journalist profile and editorial rules.",
  },
  {
    title: "Translate Articles",
    status: "Live",
    href: "/language-studio?tab=Translations",
    description:
      "Translate and localise approved source articles into the Language Studio target language stack.",
  },
  {
    title: "YouTube Transcripts",
    status: "Live",
    href: "/article-studio/youtube-transcripts",
    description:
      "Import a YouTube transcript, generate articles with quotes, and save scripts into the Article Studio pipeline.",
  },
  {
    title: "News Shorts (Video & Image)",
    status: "Live",
    href: "/news-shorts",
    description:
      "Turn article-led scripts and editorial assets into Planet Sport news shorts, video outputs and image formats.",
  },
  {
    title: "Review Queue",
    status: "Live",
    href: "/language-studio?tab=Review%20Queue",
    description:
      "Review generated rewrites and translations before approval, export feeds and client delivery.",
  },
];

const languageStudioAdminTools = [
  {
    name: "Source Brands",
    description: "Manage feeds, source URLs, parser types and active source settings.",
    tab: "Source Brands",
  },
  {
    name: "Content Creators",
    description: "Maintain creator profiles, style notes and editorial guidelines.",
    tab: "Journalists",
  },
  {
    name: "Guardrails",
    description: "Configure quality, safety and editorial guardrail checks.",
    tab: "Guardrails",
  },
  {
    name: "Knowledge Files",
    description: "Store reusable editorial lessons and AI correction knowledge.",
    tab: "Knowledge Files",
  },
  {
    name: "Glossary",
    description: "Manage brand, sport and market terminology.",
    tab: "Glossary",
  },
  {
    name: "Protected Terms",
    description: "Protect names, teams, stats and terms from unsafe changes.",
    tab: "Protected Terms",
  },
  {
    name: "Market Rules",
    description: "Set language, market, compliance and localisation rules.",
    tab: "Market Rules",
  },
  {
    name: "Prompt Rules",
    description: "Tune prompt instructions by content type and language.",
    tab: "Prompt Rules",
  },
  {
    name: "Compliance Notes",
    description: "Record market-specific compliance rules and escalation guidance.",
    tab: "Compliance Notes",
  },
  {
    name: "Quality Checks",
    description: "Review quality check history and AI correction behaviour.",
    tab: "Quality Checks",
  },
  {
    name: "Export Feeds",
    description: "Open XML, JSON, client and approved-content export feeds.",
    tab: "Export Feeds",
  },
  {
    name: "Client Access",
    description: "Manage client access, API keys and access logs.",
    tab: "Client Access",
  },
  {
    name: "Settings",
    description: "Open Language Studio settings and rules configuration.",
    tab: "Settings",
  },
];

export default function ArticleStudioPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#24301f] bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.16),transparent_30%),#070b12] px-6 py-10 shadow-2xl md:px-10">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Article Studio</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            Rewrite, translate and create articles from one place.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Article Studio brings Language Studio rewrite, translation and YouTube transcript workflows into one
            editorial hub. Use it to turn source articles and imported scripts into publishable Plexa Studio articles.
          </p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {articleWorkflows.map((workflow) => (
          <Panel key={workflow.title} title={workflow.status}>
            <div className="flex h-full flex-col gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">{workflow.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{workflow.description}</p>
              </div>
              <Link href={workflow.href}>
                <R365Button>Open {workflow.title}</R365Button>
              </Link>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Language Studio Admin">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {languageStudioAdminTools.map((tool) => (
            <Link
              key={tool.name}
              href={`/language-studio?tab=${encodeURIComponent(tool.tab)}`}
              className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 transition hover:border-[#22c55e]/60"
            >
              <p className="text-sm font-bold text-[color:var(--text-primary)]">{tool.name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{tool.description}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
