import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { DeleteTemplateButton } from "@/app/components/TemplateActions";
import { getRacingDataProvider } from "@/app/features/data/providers";
import { PlanetFootballTableNewButton } from "@/app/features/planet-football/PlanetFootballTableNewButton";

export default async function PlanetFootballTablePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getPlanetFootballTableBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Planet Football Table Shorts</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Import a Sport365 football standings URL, preview parsed rows, then create editable table Shorts templates.
          </p>
        </div>
        <PlanetFootballTableNewButton editorBasePath={editorBasePath} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => (
          <Panel key={b.id} title={b.table.competition}>
            <div className="flex flex-wrap items-center gap-2">
              {b.id.startsWith("tpl-") ? (
                <span className="rounded bg-[#38bdf8]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#38bdf8]">
                  Your template
                </span>
              ) : null}
              <DeleteTemplateButton format="planet-football-table" id={b.id} />
            </div>
            <p className="mt-2 text-sm text-slate-400">{b.table.sourceUrl || "Manual table"}</p>
            <p className="mt-2 text-xs text-slate-500">{b.table.rows.length} teams</p>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              {b.table.rows.slice(0, 8).map((r) => (
                <p key={`${b.id}-${r.position}-${r.team}`}>
                  {r.position}. {r.team} ({r.points} pts)
                </p>
              ))}
            </div>
            <Link
              href={`${editorBasePath}/planet-football-table/${b.id}`}
              className="mt-4 inline-flex text-sm font-bold text-[#38bdf8] hover:underline"
            >
              Open in editor →
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
