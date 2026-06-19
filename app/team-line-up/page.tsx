import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { DeleteTemplateButton } from "@/app/components/TemplateActions";
import { TemplateNewButton } from "@/app/components/TemplateNewButton";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function TeamLineUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getTeamLineUpBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Team Line-Up Template</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Import Sport365 Match Centre line-ups and generate branded formation pitch cards for Football365,
            TEAMtalk, PlanetFootball, and Sport365.
          </p>
        </div>
        <TemplateNewButton format="team-line-up" editorBasePath={editorBasePath} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.length === 0 ? (
          <Panel title="No templates yet">
            <p className="text-sm text-slate-400">
              Click <strong className="text-white">New template</strong> and paste a Sport365 match URL.
            </p>
          </Panel>
        ) : (
          items.map((b) => (
            <Panel key={b.id} title={`${b.home.name} vs ${b.away.name}`}>
              <div className="flex flex-wrap items-center gap-2">
                {b.id.startsWith("tpl-") ? (
                  <span className="rounded bg-[#22d3ee]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#22d3ee]">
                    Your template
                  </span>
                ) : null}
                <DeleteTemplateButton format="team-line-up" id={b.id} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{b.competition ?? b.league}</p>
              <p className="mt-1 text-xs text-slate-500">
                {b.lineupStatus} · {b.home.formation} / {b.away.formation} · {b.brandStyle}
              </p>
              <Link
                href={`${editorBasePath}/team-line-up/${b.id}`}
                className="mt-4 inline-flex text-sm font-bold text-[#22d3ee] hover:underline"
              >
                Open in editor →
              </Link>
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}
