"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";
import type { Sport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";

const DEFAULT_URL =
  "https://www.sport365.com/football/world-cup/group-stage/brazil-vs-morocco/1-4109460";

type ImportResponse = {
  success?: boolean;
  error?: string;
  data?: Sport365LineupImport;
};

export function FootballLineupsNewButton({
  editorBasePath = "/editor",
  buttonLabel = "New template",
  modalTitle = "New template",
}: {
  editorBasePath?: "/editor" | "/landscape/editor";
  buttonLabel?: string;
  modalTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Sport365LineupImport | null>(null);

  const withEditorBase = (editorPath?: string) =>
    editorPath?.startsWith("/editor/") ? editorPath.replace("/editor", editorBasePath) : editorPath;

  const parse = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/team-line-up/sport365", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json()) as ImportResponse;
      if (!res.ok || !json.success || !json.data) throw new Error(json.error || "Parse failed");
      setPreview(json.data);
      return json.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
      setPreview(null);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async (data?: Sport365LineupImport) => {
    const imp = data ?? preview;
    if (!imp) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/football-lineups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: imp }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; editorPath?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "Create failed");
      setOpen(false);
      setPreview(null);
      if (json.editorPath) router.push(withEditorBase(json.editorPath) ?? json.editorPath);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const importFromSport365 = async () => {
    const imp = await parse();
    if (imp) await create(imp);
  };

  return (
    <div className="space-y-1">
      <R365Button type="button" onClick={() => setOpen(true)} disabled={busy}>
        {busy ? "Working…" : buttonLabel}
      </R365Button>
      {open && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="football-lineups-new-title"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div className="ui-modal relative z-10 w-full max-w-lg p-5" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="football-lineups-new-title" className="text-lg font-semibold text-[color:var(--text-primary)]">
              {modalTitle}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Paste a <strong className="font-semibold text-[color:var(--text-primary)]">Sport365 Match Centre</strong>{" "}
              URL to import formations, starting XIs, bench, and injuries for the three-board Shorts template.
            </p>
            {error ? <p className="mt-2 text-xs font-medium text-[color:var(--danger)]">{error}</p> : null}
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sport365 match URL
              <input
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreview(null);
                }}
                placeholder={DEFAULT_URL}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Brand style
              <select
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white"
                value="football365"
                disabled
                aria-readonly="true"
              >
                <option value="football365">Football365</option>
              </select>
            </label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <R365Button type="button" onClick={() => void importFromSport365()} disabled={busy || !url.trim()}>
                {busy ? "Importing from Sport365…" : "Import from Sport365 URL"}
              </R365Button>
              <R365Button type="button" variant="ghost" onClick={() => void parse()} disabled={busy || !url.trim()}>
                Preview only
              </R365Button>
              {preview ? (
                <R365Button type="button" variant="ghost" onClick={() => void create()} disabled={busy}>
                  Create template
                </R365Button>
              ) : null}
            </div>
            {preview ? (
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                <p className="font-semibold text-white">
                  {preview.homeTeam} vs {preview.awayTeam}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {preview.competition} · {preview.lineupStatus} · {preview.home.formation} / {preview.away.formation}
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  {preview.home.starters.length} starters · {preview.bench.home.length + preview.bench.away.length}{" "}
                  bench · {preview.injuries.home.length + preview.injuries.away.length} injuries/suspensions
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-4 w-full rounded-lg border py-2 text-sm font-medium text-[color:var(--text-secondary)]"
              style={{ borderColor: "var(--border)" }}
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
