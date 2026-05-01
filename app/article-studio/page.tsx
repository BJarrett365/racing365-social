import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Article Studio · ${BRAND_SUITE}`,
};

const articleWorkflows = [
  {
    title: "Rewrite",
    status: "Live",
    href: "/language-studio?tab=Rewrite",
    description:
      "Rewrite imported articles and YouTube transcript source material with content style, sport, journalist profile and editorial rules.",
  },
  {
    title: "Translation",
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
    title: "Review Queue",
    status: "Live",
    href: "/language-studio?tab=Review%20Queue",
    description:
      "Review generated rewrites and translations before approval, export feeds and client delivery.",
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
            editorial hub. Use it to turn source articles and imported scripts into publishable Plexa articles.
          </p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
    </div>
  );
}
