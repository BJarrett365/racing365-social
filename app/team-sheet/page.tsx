import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { DeleteTemplateButton } from "@/app/components/TemplateActions";
import { TeamSheetNewButton } from "@/app/features/team-sheet/TeamSheetNewButton";
import { TEAM_SHEET_VARIANTS } from "@/app/lib/team-sheet/build-bundle";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function TeamSheetPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getTeamSheetBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Team Sheet Template</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Import Sport365 Match Centre line-ups and generate readable team sheet graphics for matchday posts,
            breaking news, and social. Four layouts: Standard, Split, Hero, and Combined.
          </p>
        </div>
        <TeamSheetNewButton editorBasePath={editorBasePath} />
      </div>

      <Panel title="Layouts">
        <ul className="grid gap-2 sm:grid-cols-2">
          {TEAM_SHEET_VARIANTS.map((v) => (
            <li key={v.id} className="rounded-lg border border-[#1f2d26] bg-black/30 px-3 py-2 text-sm">
              <span className="font-bold text-[#22d3ee]">{v.label}</span>
              <span className="mt-0.5 block text-xs text-slate-400">{v.hint}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {items.length === 0 ? (
          <Panel title="No templates yet">
            <p className="text-sm text-slate-400">
              Click <strong className="text-white">New Team Sheet</strong> and paste a Sport365 match URL.
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
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                  {b.sheetVariant}
                </span>
                <DeleteTemplateButton format="team-sheet" id={b.id} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{b.competition ?? b.league}</p>
              <p className="mt-1 text-xs text-slate-500">
                {b.lineupStatus} · {b.brandStyle} · {b.exportAspect ?? "portrait"}
              </p>
              <Link
                href={`${editorBasePath}/team-sheet/${b.id}`}
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
