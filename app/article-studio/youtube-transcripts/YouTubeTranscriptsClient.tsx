"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import type { YouTubeScriptImport } from "@/app/lib/youtube-script/types";

type Props = {
  initialImports: YouTubeScriptImport[];
  importedArticleCount: number;
};

function formatDate(value?: string): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function excerpt(value: string, max = 260): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
}

export function YouTubeTranscriptsClient({ initialImports, importedArticleCount }: Props) {
  const [imports, setImports] = useState(initialImports);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialImports[0] ? [initialImports[0].id] : []);
  const [selectionMode, setSelectionMode] = useState<"selected" | "all">("selected");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeIds = selectionMode === "all" ? imports.map((row) => row.id) : selectedIds;
  const selectedSet = useMemo(() => new Set(activeIds), [activeIds]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSelectionMode("selected");
    setSelectedIds((rows) => rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id]);
  };

  const moveToReviewQueue = () =>
    run(async () => {
      if (activeIds.length === 0) throw new Error("Select at least one YouTube script.");
      const res = await fetch("/api/article-studio/youtube-transcripts/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importIds: activeIds }),
      });
      const data = (await res.json().catch(() => ({}))) as { reviewItems?: unknown[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not move scripts to Review Queue.");
      setMessage(`${data.reviewItems?.length ?? activeIds.length} script(s) moved to Review Queue.`);
    });

  const deleteSelected = () =>
    run(async () => {
      if (activeIds.length === 0) throw new Error("Select at least one YouTube script.");
      const rowsToDelete = imports.filter((row) => activeIds.includes(row.id));
      const articleIds = rowsToDelete.map((row) => `youtube-${row.meta.videoId}`);
      const res = await fetch("/api/youtube/save", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importIds: activeIds, articleIds }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete selected scripts.");
      setImports((rows) => rows.filter((row) => !activeIds.includes(row.id)));
      setSelectedIds([]);
      setSelectionMode("selected");
      setMessage(`${activeIds.length} script(s) deleted.`);
    });

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <Panel title={`Saved scripts (${imports.length})`}>
        {imports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
            No YouTube scripts saved yet. Import a transcript, generate or edit the output, then save it to Plexa.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {imports.map((row) => {
                const articleOutput = row.outputs.find((output) => output.type === "article");
                return (
                  <article
                    key={row.id}
                    className={`rounded-xl border bg-black/20 p-4 transition ${selectedSet.has(row.id) ? "border-emerald-500" : "border-[#1f2d26] hover:border-emerald-500/50"}`}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <input
                        className="mt-1"
                        type="checkbox"
                        checked={selectedSet.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold leading-5 text-white">{row.meta.title}</h2>
                        <p className="mt-1 text-xs text-slate-400">
                          {row.meta.channelName ?? "Unknown channel"} · Saved {formatDate(row.updatedAt)} ·{" "}
                          {row.transcript.fullText.length.toLocaleString()} chars · {row.outputs.length} output(s)
                        </p>
                        <p className="mt-2 text-xs leading-5 text-emerald-300">
                          Source script: {excerpt(row.transcript.fullText)}
                        </p>
                        {articleOutput ? (
                          <p className="mt-2 text-xs leading-5 text-slate-300">
                            Generated article: {excerpt(articleOutput.content, 220)}
                          </p>
                        ) : null}
                      </div>
                      {row.meta.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.meta.thumbnailUrl} alt="" className="hidden aspect-video w-40 rounded-lg object-cover md:block" />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="space-y-3 rounded-xl border border-[#1f2d26] bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Articles to translate</p>
              <div className="space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={selectionMode === "selected"} onChange={() => setSelectionMode("selected")} />
                  Selected articles ({selectedIds.length})
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={selectionMode === "all"} onChange={() => setSelectionMode("all")} />
                  All imported articles ({importedArticleCount})
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-md border border-[#1f2d26] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-[#22c55e]/60 hover:text-white" onClick={() => { setSelectionMode("selected"); setSelectedIds(imports.map((row) => row.id)); }}>
                  Select all
                </button>
                <button type="button" className="rounded-md border border-[#1f2d26] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-[#22c55e]/60 hover:text-white" onClick={() => { setSelectionMode("selected"); setSelectedIds([]); }}>
                  Clear
                </button>
                <button type="button" className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:border-red-400 hover:text-red-100" onClick={() => void deleteSelected()} disabled={busy}>
                  Delete selected
                </button>
              </div>
              <R365Button onClick={() => void moveToReviewQueue()} disabled={busy || activeIds.length === 0}>
                {busy ? "Moving..." : "Move selected to Review Queue"}
              </R365Button>
              <div className="flex flex-wrap gap-2">
                <Link href="/language-studio?tab=Review%20Queue">
                  <R365Button variant="ghost">Open Queue</R365Button>
                </Link>
                <Link href="/language-studio?tab=Rewrite">
                  <R365Button variant="ghost">Open Rewrite</R365Button>
                </Link>
                <Link href="/language-studio?tab=Translations">
                  <R365Button variant="ghost">Open Translations</R365Button>
                </Link>
              </div>
            </aside>
          </div>
        )}
      </Panel>
    </div>
  );
}
