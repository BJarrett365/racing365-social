import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { DeleteTemplateButton } from "@/app/components/TemplateActions";
import { ScoreLineNewButton } from "@/app/features/score-line/ScoreLineNewButton";
import { displayScoreLineStatus } from "@/app/lib/score-line/build-bundle";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function ScoreLinePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getScoreLineBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Score Line Template</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Import Sport365 match results and generate full-bleed score line graphics — hero image with branded
            full-time overlay, team flags, and score. Sport365, Planet Football, TEAMtalk, and Football365 styles.
          </p>
        </div>
        <ScoreLineNewButton editorBasePath={editorBasePath} />
      </div>

      <Panel title="Layout">
        <p className="text-sm text-slate-400">
          Full-bleed hero background with a semi-transparent score box at the bottom — status ribbon, team crests, and
          accent-coloured scoreline. Upload a player or match photo in the editor for the hero image.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {items.length === 0 ? (
          <Panel title="No templates yet">
            <p className="text-sm text-slate-400">
              Click <strong className="text-white">New Score Line</strong> and paste a Sport365 match URL.
            </p>
          </Panel>
        ) : (
          items.map((b) => {
            const ctx = b.matchContext;
            const status = displayScoreLineStatus(b.statusDisplay ?? ctx.statusLabel, ctx.status);
            return (
              <Panel key={b.id} title={`${ctx.homeTeam} ${ctx.homeScore}–${ctx.awayScore} ${ctx.awayTeam}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {b.id.startsWith("tpl-") ? (
                    <span className="rounded bg-[#22d3ee]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#22d3ee]">
                      Your template
                    </span>
                  ) : null}
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                    {status}
                  </span>
                  <DeleteTemplateButton format="score-line" id={b.id} />
                </div>
                <p className="mt-2 text-sm text-slate-400">{b.competition ?? "Match result"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {b.brandStyle} · {b.exportAspect ?? "portrait"}
                </p>
                <Link
                  href={`${editorBasePath}/score-line/${b.id}`}
                  className="mt-4 inline-flex text-sm font-bold text-[#22d3ee] hover:underline"
                >
                  Open in editor →
                </Link>
              </Panel>
            );
          })
        )}
      </div>
    </div>
  );
}
