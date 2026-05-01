import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { CreateTemplateButton, DeleteTemplateButton } from "@/app/components/TemplateActions";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function F1ResultsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getF1ResultsBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">F1 Results Template</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            {landscapeMode ? "Landscape" : "Portrait"}{" "}
            <strong className="text-slate-300">{landscapeMode ? "1920×1080" : "1080×1350"}</strong> graphics: Intro,
            Results (page 1/2), Results (page 2/2), Outro with <strong className="text-slate-300">fastest lap</strong>,
            times and <strong className="text-slate-300">stops</strong>. Export PNG frames and Shorts MP4 from the
            editor. Saved templates use <code className="text-slate-500">tpl-…</code> ids in{" "}
            <code className="text-slate-500">data/local/user-templates.json</code>. Demo data:{" "}
            <code className="text-slate-500">data/dummy/f1-results.json</code>.
          </p>
        </div>
        <CreateTemplateButton format="f1-results" editorBasePath={editorBasePath} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-500 md:col-span-2">
            No results templates yet — click <strong className="text-slate-400">New template</strong> to create a{" "}
            <code className="text-slate-600">tpl-*</code> bundle.
          </p>
        )}
        {items.map((b) => {
          const title = `${b.title} — ${b.subtitle}`.trim();
          return (
            <Panel key={b.id} title={title.slice(0, 80) + (title.length > 80 ? "…" : "")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#b6ff00]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#b6ff00]">
                  RESULTS
                </span>
                <DeleteTemplateButton format="f1-results" id={b.id} />
              </div>
              <p className="mt-2 font-mono text-xs text-slate-500">{b.id}</p>
              <p className="mt-1 text-xs text-slate-500">{b.drivers.length} drivers</p>
              <Link
                href={`${editorBasePath}/f1-results/${b.id}`}
                className="mt-4 inline-flex text-sm font-bold text-[#eab308] hover:underline"
              >
                Open in editor →
              </Link>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
