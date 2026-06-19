"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { R365Button } from "@/app/components/R365Button";
import { TEAM_LINE_UP_BRAND_STYLES } from "@/app/lib/team-line-up/brand-styles";
import type { TeamLineUpBrandStyle } from "@/types";

const DEFAULT_URL =
  "https://www.sport365.com/football/world-cup/group-stage/spain-vs-cape-verde/1-4109460";

type PreviewMatch = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  statusLabel?: string;
  competition?: string;
};

export function ScoreLineNewButton({
  editorBasePath = "/editor",
  buttonLabel = "New Score Line",
  modalTitle = "Score Line template",
}: {
  editorBasePath?: "/editor" | "/landscape/editor";
  buttonLabel?: string;
  modalTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [brandStyle, setBrandStyle] = useState<TeamLineUpBrandStyle>("sport365");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewMatch | null>(null);

  const withEditorBase = (editorPath?: string) =>
    editorPath?.startsWith("/editor/") ? editorPath.replace("/editor", editorBasePath) : editorPath;

  const parsePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/planet-football/match-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        matchContext?: PreviewMatch;
      };
      if (!res.ok || !json.success || !json.matchContext) {
        throw new Error(json.error || "Parse failed");
      }
      setPreview(json.matchContext);
      return json.matchContext;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
      setPreview(null);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/score-line/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), brandStyle }),
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
    const p = preview ?? (await parsePreview());
    if (p) await create();
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
          aria-labelledby="score-line-new-title"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div className="ui-modal relative z-10 w-full max-w-lg p-5" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="score-line-new-title" className="text-lg font-semibold text-[color:var(--text-primary)]">
              {modalTitle}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Import a <strong className="font-semibold text-[color:var(--text-primary)]">Sport365 Match Centre</strong>{" "}
              URL for full-time score line graphics — hero image with branded score overlay.
            </p>
            {error ? <p className="mt-2 text-xs font-medium text-[color:var(--danger)]">{error}</p> : null}
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sport365 match URL
              <input
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white [color-scheme:dark]"
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
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white [color-scheme:dark]"
                value={brandStyle}
                onChange={(e) => setBrandStyle(e.target.value as TeamLineUpBrandStyle)}
              >
                {TEAM_LINE_UP_BRAND_STYLES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <R365Button type="button" onClick={() => void importFromSport365()} disabled={busy || !url.trim()}>
                {busy ? "Importing from Sport365…" : "Import from Sport365 URL"}
              </R365Button>
              <R365Button type="button" variant="ghost" onClick={() => void parsePreview()} disabled={busy || !url.trim()}>
                Preview only
              </R365Button>
            </div>
            {preview ? (
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                <p className="font-semibold text-white">
                  {preview.homeTeam} {preview.homeScore}–{preview.awayScore} {preview.awayTeam}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {preview.statusLabel ?? "Match"} {preview.competition ? `· ${preview.competition}` : ""}
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
