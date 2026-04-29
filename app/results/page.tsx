import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { RaceSilkPreview } from "@/app/components/RaceSilkPreview";
import { CreateTemplateButton, DeleteTemplateButton } from "@/app/components/TemplateActions";
import { winnerSilksFromResult } from "@/app/features/content/content-generator";
import { getRacingDataProvider } from "@/app/features/data/providers";
import { defaultSilksForIndex } from "@/app/lib/silk-presets";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getFastResults();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Fast results Shorts</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Dummy results plus your templates. Use <strong className="text-slate-300">New template</strong>{" "}
            for a fresh card (saved under <code className="text-slate-500">data/local/</code>).
          </p>
        </div>
        <CreateTemplateButton format="fast-results" editorBasePath={editorBasePath} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => (
          <Panel key={b.id} title={`${b.result.race.course} ${b.result.race.raceTime}`}>
            <div className="flex flex-wrap items-center gap-2">
              {b.id.startsWith("tpl-") && (
                <span className="rounded bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#22c55e]">
                  Your template
                </span>
              )}
              <DeleteTemplateButton format="fast-results" id={b.id} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-2.5 text-2xl font-black text-white">
              <RaceSilkPreview
                silks={winnerSilksFromResult(b.result) ?? defaultSilksForIndex(0)}
                heightPx={40}
              />
              <span>
                {b.result.winner}{" "}
                <span className="text-[#22c55e]">SP {b.result.sp}</span>
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {b.result.placings.map((p, i) => (
                <li
                  key={`${b.id}-place-${p.position}-${i}`}
                  className="flex items-center gap-2.5"
                >
                  <RaceSilkPreview silks={p.silks ?? defaultSilksForIndex(i)} heightPx={28} />
                  <span>
                    {p.position}. {p.horse} — {p.sp}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={`${editorBasePath}/fast-results/${b.id}`}
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
