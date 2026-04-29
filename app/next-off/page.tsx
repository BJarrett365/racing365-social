import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { RaceSilkPreview } from "@/app/components/RaceSilkPreview";
import { CreateTemplateButton, DeleteTemplateButton } from "@/app/components/TemplateActions";
import { getRacingDataProvider } from "@/app/features/data/providers";
import { defaultSilksForIndex } from "@/app/lib/silk-presets";

export default async function NextOffPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getNextOffBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Next off Shorts</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Seed feed plus your saved templates. <strong className="text-slate-300">New template</strong>{" "}
            starts a blank layout you can edit and persist (tpl-… ids).
          </p>
        </div>
        <CreateTemplateButton format="next-off" editorBasePath={editorBasePath} />
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
              <DeleteTemplateButton format="next-off" id={b.id} />
            </div>
            <p className="mt-2 text-sm text-slate-500">{b.race.title}</p>
            <ul className="mt-4 space-y-2">
              {b.tips.map((t, i) => (
                <li
                  key={`${b.id}-tip-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <RaceSilkPreview silks={t.silks ?? defaultSilksForIndex(i)} heightPx={32} />
                    <span className="truncate font-semibold text-white">{t.horse}</span>
                  </span>
                  <span className="shrink-0 text-lg font-black text-[#22c55e]">{t.odds}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`${editorBasePath}/next-off/${b.id}`}
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
