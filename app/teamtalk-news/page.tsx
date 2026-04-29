import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { CreateTemplateButton, DeleteTemplateButton } from "@/app/components/TemplateActions";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function TeamtalkNewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const landscapeMode = sp.mode === "landscape";
  const editorBasePath = landscapeMode ? "/landscape/editor" : "/editor";
  const items = await getRacingDataProvider().getTeamtalkNewsBundles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">TEAMtalk News Shorts</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Transfer-style 9:16 graphics: mint headline bars, optional player + club crests, footer CTA. Your saved
            templates use ids <code className="text-slate-500">tpl-…</code> in{" "}
            <code className="text-slate-500">data/local/user-templates.json</code>. Demo rows come from{" "}
            <code className="text-slate-500">data/dummy/teamtalk-news.json</code>.
          </p>
        </div>
        <CreateTemplateButton format="teamtalk-news" editorBasePath={editorBasePath} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-500 md:col-span-2">
            No stories yet — click <strong className="text-slate-400">New template</strong> to create a{" "}
            <code className="text-slate-600">tpl-*</code> bundle.
          </p>
        )}
        {items.map((b) => {
          const h1 = b.headlineLines.find((l) => l.trim()) ?? "Untitled";
          return (
            <Panel key={b.id} title={h1.slice(0, 72) + (h1.length > 72 ? "…" : "")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#23ff9f]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#23ff9f]">
                  {b.tag}
                </span>
                <DeleteTemplateButton format="teamtalk-news" id={b.id} />
              </div>
              <p className="mt-2 font-mono text-xs text-slate-500">{b.id}</p>
              <Link
                href={`${editorBasePath}/teamtalk-news/${b.id}`}
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
