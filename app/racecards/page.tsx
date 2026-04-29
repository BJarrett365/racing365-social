import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { RaceSilkPreview } from "@/app/components/RaceSilkPreview";
import { DeleteTemplateButton } from "@/app/components/TemplateActions";
import { RacecardTemplateNewButton } from "@/app/features/racecards/RacecardTemplateNewButton";
import { getRacingDataProvider } from "@/app/features/data/providers";
import { defaultSilksForIndex } from "@/app/lib/silk-presets";

export default async function RacecardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getRacecardSnapshots();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Racecard snapshots</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            LED boards with <strong className="text-slate-300">jockey silks</strong> per runner, dummy cards,
            and your own templates. <strong className="text-slate-300">New template</strong> seeds five
            runners with default colours.
          </p>
        </div>
        <RacecardTemplateNewButton editorBasePath={editorBasePath} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => (
          <Panel key={b.id} title={`${b.race.course} ${b.race.raceTime}`}>
            <div className="flex flex-wrap items-center gap-2">
              {b.id.startsWith("tpl-") && (
                <span className="rounded bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#22c55e]">
                  Your template
                </span>
              )}
              <DeleteTemplateButton format="racecard" id={b.id} />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {b.race.title} · {b.runners.length} runners
            </p>
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">Top picks</p>
            <p className="text-sm text-[#eab308]">{b.topPicks.join(" · ")}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {b.runners.slice(0, 5).map((r, i) => (
                <li
                  key={`${b.id}-r-${r.number}-${i}`}
                  className="flex items-center justify-between gap-3 text-slate-300"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <RaceSilkPreview silks={r.silks ?? defaultSilksForIndex(i)} heightPx={28} />
                    <span className="truncate">
                      <span className="font-mono text-slate-500">{r.number}.</span> {r.horse}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-[#22c55e]">{r.odds}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`${editorBasePath}/racecard/${b.id}`}
              className="mt-4 inline-flex text-sm font-bold text-[#eab308] hover:underline"
            >
              Open in editor →
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
