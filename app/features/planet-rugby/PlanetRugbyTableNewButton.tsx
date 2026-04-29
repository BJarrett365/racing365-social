"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";

type ParsedRow = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsDifference: string;
  points: number;
};

type ParsedData = {
  source: "Planet Rugby";
  sourceUrl: string;
  competition: string;
  updatedAt?: string;
  imageUrl?: string;
  rows: ParsedRow[];
};

export function PlanetRugbyTableNewButton({
  editorBasePath = "/editor",
}: {
  editorBasePath?: "/editor" | "/landscape/editor";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("https://www.planetrugby.com/tournament/premiership/table");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedData | null>(null);

  const parse = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/planet-rugby/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: ParsedData };
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || "Parse failed");
      setPreview(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/planet-rugby/table-short/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: preview }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; editorPath?: string };
      if (!res.ok || !json.success || !json.editorPath) throw new Error(json.error || "Create failed");
      const path = json.editorPath.startsWith("/editor/")
        ? json.editorPath.replace("/editor", editorBasePath)
        : json.editorPath;
      setOpen(false);
      router.push(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <R365Button type="button" onClick={() => setOpen(true)} disabled={busy}>
        New template
      </R365Button>
      {open ? (
        <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="ui-modal w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">New Planet Rugby table template</h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Paste a PlanetRugby tournament table URL, parse rows, then create an editable Shorts template.</p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Planet Rugby table URL
              <input className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <R365Button type="button" variant="ghost" onClick={() => void parse()} disabled={busy}>
                {busy ? "Parsing..." : "Import from URL"}
              </R365Button>
              {preview ? (
                <R365Button type="button" onClick={() => void create()} disabled={busy}>
                  {busy ? "Creating..." : "Create template"}
                </R365Button>
              ) : null}
            </div>
            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
            {preview ? (
              <div className="mt-3 rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
                <p className="text-sm text-slate-200">{preview.competition}</p>
                <p className="text-xs text-slate-500">{preview.rows.length} rows parsed</p>
                <div className="mt-2 max-h-40 overflow-y-auto text-xs text-slate-300">
                  {preview.rows.slice(0, 12).map((r) => (
                    <p key={`${r.position}-${r.team}`}>{r.position}. {r.team} - PTS {r.points}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
