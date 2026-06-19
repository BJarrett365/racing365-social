import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { DeleteTemplateButton } from "@/app/components/TemplateActions";
import { TemplateNewButton } from "@/app/components/TemplateNewButton";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function FootballLineupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getFootballLineups();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Football line-ups Template</h1>
          <p className="mt-2 text-slate-400">
            Three-board Shorts: formation pitch, bench list, injuries &amp; suspensions. Import from Sport365 or open
            dummy fixtures in{" "}
            <code className="text-slate-500">data/dummy/football-lineups.json</code>.
          </p>
        </div>
        <TemplateNewButton format="football-lineups" editorBasePath={editorBasePath} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => (
          <Panel key={b.id} title={`${b.home.name} vs ${b.away.name}`}>
            <div className="flex flex-wrap items-center gap-2">
              {b.id.startsWith("tpl-") ? (
                <span className="rounded bg-[#22d3ee]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#22d3ee]">
                  Your template
                </span>
              ) : null}
              <DeleteTemplateButton format="football-lineups" id={b.id} />
            </div>
            <p className="text-sm text-slate-500">
              {b.league} · {b.matchDate} {b.kickoff}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {b.home.formation} vs {b.away.formation}
            </p>
            {b.sourceUrl ? (
              <p className="mt-1 text-xs text-slate-500">
                <a href={b.sourceUrl} className="text-[#38bdf8] hover:underline" target="_blank" rel="noreferrer">
                  Sport365 source
                </a>
              </p>
            ) : null}
            <Link
              href={`${editorBasePath}/football-lineups/${b.id}`}
              className="mt-4 inline-flex text-sm font-bold text-[#22d3ee] hover:underline"
            >
              Open in editor →
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
