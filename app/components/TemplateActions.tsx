"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { R365Button } from "@/app/components/R365Button";
import { RacecardUrlImportForm } from "@/app/features/racecards/RacecardUrlImportForm";
import { parseDataFeedKeyValueCsv } from "@/app/lib/data-feed-csv";
import { PENDING_TEMPLATE_FEED_STORAGE_KEY, parseDataFeedJsonDocument } from "@/app/lib/data-feed-json";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { F1GridBundle, F1ResultsBundle, FastResultBundle, NextOffBundle } from "@/types";

type FormatKey =
  | "next-off"
  | "fast-results"
  | "racecard"
  | "teamtalk-news"
  | "f1-grid"
  | "f1-results"
  | "planet-football-table"
  | "planet-rugby-table";

type RacingUrlDraft =
  | { format: "next-off"; draft: Omit<NextOffBundle, "id"> }
  | { format: "fast-results"; draft: Omit<FastResultBundle, "id"> }
  | { format: "f1-grid"; draft: Omit<F1GridBundle, "id"> }
  | { format: "f1-results"; draft: Omit<F1ResultsBundle, "id"> };

type ModalStep = "main" | "url" | "confirm";

function usesRacingUrlImport(
  fmt: FormatKey,
): fmt is "next-off" | "fast-results" | "f1-grid" | "f1-results" {
  return fmt === "next-off" || fmt === "fast-results" || fmt === "f1-grid" || fmt === "f1-results";
}

function parseFeedFileToPending(text: string): {
  rows: Record<string, string>;
  jsonRoot: Record<string, unknown> | null;
} {
  const t = text.trim();
  if (t.startsWith("{")) {
    const doc = parseDataFeedJsonDocument(text);
    return { rows: doc.rows, jsonRoot: doc.root };
  }
  return { rows: parseDataFeedKeyValueCsv(text), jsonRoot: null };
}

export function CreateTemplateButton({
  format,
  editorBasePath = "/editor",
}: {
  format: FormatKey;
  editorBasePath?: "/editor" | "/landscape/editor";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("main");
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState<RacingUrlDraft | null>(null);

  const withEditorBase = (editorPath?: string) =>
    editorPath?.startsWith("/editor/") ? editorPath.replace("/editor", editorBasePath) : editorPath;

  const resetRacingUrlFlow = () => {
    setStep("main");
    setUrlErr(null);
    setUrlDraft(null);
  };

  const openModal = () => {
    setErr(null);
    resetRacingUrlFlow();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!busy) {
      setModalOpen(false);
      resetRacingUrlFlow();
      setErr(null);
    }
  };

  const createBlankAndGo = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const data = await parseApiJson<{ error?: string; editorPath?: string; id?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Create failed");
      setModalOpen(false);
      resetRacingUrlFlow();
      if (data.editorPath) router.push(withEditorBase(data.editorPath) ?? data.editorPath);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const handleRacingUrlFetch = async (url: string) => {
    if (!usesRacingUrlImport(format)) return;
    setUrlErr(null);
    setBusy(true);
    try {
      if (format === "f1-grid" || format === "f1-results") {
        const mode = format === "f1-grid" ? "grid" : "race";
        const res = await fetch("/api/planetf1-f1-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, mode }),
        });
        const data = await parseApiJson<{
          error?: string;
          mode?: "grid" | "race";
          bundle?: Omit<F1GridBundle, "id"> | Omit<F1ResultsBundle, "id">;
        }>(res);
        if (!res.ok) throw new Error(data.error || "Fetch failed");
        if (format === "f1-grid" && data.mode === "grid" && data.bundle) {
          setUrlDraft({ format: "f1-grid", draft: data.bundle as Omit<F1GridBundle, "id"> });
        } else if (format === "f1-results" && data.mode === "race" && data.bundle) {
          setUrlDraft({ format: "f1-results", draft: data.bundle as Omit<F1ResultsBundle, "id"> });
        } else {
          throw new Error("Unexpected response from server");
        }
      } else {
        const res = await fetch("/api/racing/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, format }),
        });
        const data = await parseApiJson<{
          error?: string;
          format?: string;
          draft?: Omit<NextOffBundle, "id"> | Omit<FastResultBundle, "id">;
        }>(res);
        // #region agent log
        fetch('http://127.0.0.1:7396/ingest/d610fd6f-4aa5-41d5-b5c5-5d5c126a1ba1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6387c1'},body:JSON.stringify({sessionId:'6387c1',runId:'fast-results-parse',hypothesisId:'H1,H2,H3,H4',location:'app/components/TemplateActions.tsx:racing-url-fetch',message:'racing url parse response',data:{status:res.status,ok:res.ok,requestedFormat:format,responseFormat:data.format,error:data.error,hasDraft:Boolean(data.draft),urlShape:url.replace(/[?&](?:token|key|api_key|apikey|password)=[^&]+/gi,'')},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!res.ok) throw new Error(data.error || "Fetch failed");
        if (format === "next-off" && data.format === "next-off" && data.draft) {
          setUrlDraft({ format: "next-off", draft: data.draft as Omit<NextOffBundle, "id"> });
        } else if (format === "fast-results" && data.format === "fast-results" && data.draft) {
          setUrlDraft({ format: "fast-results", draft: data.draft as Omit<FastResultBundle, "id"> });
        } else {
          throw new Error("Unexpected response from server");
        }
      }
      setStep("confirm");
    } catch (e) {
      setUrlErr(e instanceof Error ? e.message : "We could not fetch data from this page");
    } finally {
      setBusy(false);
    }
  };

  const persistRacingUrlDraft = async () => {
    if (!urlDraft) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: urlDraft.format }),
      });
      const data = await parseApiJson<{ error?: string; editorPath?: string; id?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Create failed");
      const id = data.id;
      if (!id) throw new Error("Missing template id");

      if (urlDraft.format === "next-off") {
        const nextOff: NextOffBundle = { ...urlDraft.draft, id };
        const put = await fetch("/api/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "next-off", nextOff }),
        });
        const putData = await parseApiJson<{ error?: string }>(put);
        if (!put.ok) throw new Error(putData.error || "Save failed");
      } else if (urlDraft.format === "fast-results") {
        const fastResults: FastResultBundle = { ...urlDraft.draft, id };
        const put = await fetch("/api/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "fast-results", fastResults }),
        });
        const putData = await parseApiJson<{ error?: string }>(put);
        if (!put.ok) throw new Error(putData.error || "Save failed");
      } else if (urlDraft.format === "f1-grid") {
        const f1Grid: F1GridBundle = { ...urlDraft.draft, id };
        const put = await fetch("/api/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "f1-grid", f1Grid }),
        });
        const putData = await parseApiJson<{ error?: string }>(put);
        if (!put.ok) throw new Error(putData.error || "Save failed");
      } else if (urlDraft.format === "f1-results") {
        const f1Results: F1ResultsBundle = { ...urlDraft.draft, id };
        const put = await fetch("/api/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: "f1-results", f1Results }),
        });
        const putData = await parseApiJson<{ error?: string }>(put);
        if (!put.ok) throw new Error(putData.error || "Save failed");
      } else {
        throw new Error("Unsupported import format");
      }

      setModalOpen(false);
      resetRacingUrlFlow();
      if (data.editorPath) router.push(withEditorBase(data.editorPath) ?? data.editorPath);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const onFeedFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const text = String(reader.result ?? "");
          const { rows, jsonRoot } = parseFeedFileToPending(text);
          const feedFmt = rows.format?.trim();
          if (feedFmt && feedFmt !== format) {
            throw new Error(
              `This file is for format “${feedFmt}”. Open ${feedFmt} templates or use a matching feed.`,
            );
          }
          const res = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format }),
          });
          const data = await parseApiJson<{ error?: string; editorPath?: string; id?: string }>(res);
          if (!res.ok) throw new Error(data.error || "Create failed");
          const id = data.id;
          if (!id) throw new Error("Missing template id");
          try {
            sessionStorage.setItem(
              PENDING_TEMPLATE_FEED_STORAGE_KEY,
              JSON.stringify({ templateId: id, rows, jsonRoot }),
            );
          } catch {
            /* quota */
          }
          setModalOpen(false);
          if (data.editorPath) router.push(withEditorBase(data.editorPath) ?? data.editorPath);
          else router.refresh();
        } catch (err_) {
          setErr(err_ instanceof Error ? err_.message : "Import failed");
        } finally {
          setBusy(false);
        }
      })();
    };
    reader.onerror = () => {
      setErr("Could not read file");
      setBusy(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-1">
      <R365Button type="button" onClick={openModal} disabled={busy}>
        {busy ? "Creating…" : "New template"}
      </R365Button>
      {modalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-template-title"
          onClick={() => {
            if (!busy) closeModal();
          }}
        >
          <div className="ui-modal relative z-10 w-full max-w-md p-5" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="new-template-title" className="text-lg font-semibold text-[color:var(--text-primary)]">
              New template
            </h2>
            {err ? <p className="mt-2 text-xs font-medium text-[color:var(--danger)]">{err}</p> : null}

            {usesRacingUrlImport(format) && step === "url" ? (
              <div className="space-y-3">
                <RacecardUrlImportForm
                  busy={busy}
                  error={urlErr}
                  onFetchParse={handleRacingUrlFetch}
                  onBack={() => {
                    setUrlErr(null);
                    setStep("main");
                  }}
                  description={
                    format === "next-off"
                      ? "Paste a Racing365-style link with a raceId query (or any page whose HTML embeds RaceID). We load the public race API and map the first three tips from selections / top runners."
                      : format === "fast-results"
                        ? "Paste the same style of race link as for a racecard. We map winner and the first four placings when official finishing order is present; otherwise we use selections and runner order (edit in the editor if needed)."
                        : format === "f1-grid"
                          ? "Paste a PlanetF1 results URL (for example planetf1.com/results/...). We parse qualifying grid data into a new F1 Grid template."
                          : "Paste a PlanetF1 results URL (for example planetf1.com/results/...). We parse race classification and fastest lap into a new F1 Results template."
                  }
                />
                <button
                  type="button"
                  className="w-full rounded-lg border py-2 text-sm font-medium text-[color:var(--text-secondary)] transition-[background-color,border-color,color] duration-200 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                  onClick={closeModal}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {usesRacingUrlImport(format) && step === "confirm" && urlDraft ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="text-xs font-medium text-[color:var(--text-secondary)] underline-offset-2 hover:underline"
                  onClick={() => {
                    setUrlDraft(null);
                    setStep("url");
                  }}
                  disabled={busy}
                >
                  ← Back
                </button>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Review imported race</p>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-secondary)]">
                  {urlDraft.format === "next-off" || urlDraft.format === "fast-results" ? (
                    <>
                      <p className="text-[color:var(--text-primary)]">
                        {(urlDraft.format === "next-off" ? urlDraft.draft.race : urlDraft.draft.result.race).course}{" "}
                        <span className="text-[#eab308]">
                          {(urlDraft.format === "next-off"
                            ? urlDraft.draft.race
                            : urlDraft.draft.result.race
                          ).raceTime}
                        </span>
                      </p>
                      <p className="mt-1 text-xs">
                        {(urlDraft.format === "next-off" ? urlDraft.draft.race : urlDraft.draft.result.race).title}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[color:var(--text-primary)]">{urlDraft.draft.title}</p>
                      <p className="mt-1 text-xs">
                        {urlDraft.draft.subtitle} - {urlDraft.draft.drivers.length} drivers
                      </p>
                    </>
                  )}
                  {urlDraft.format === "next-off" ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {urlDraft.draft.tips.map((t, i) => (
                        <li key={`${t.horse}-${i}`}>
                          {t.kicker ?? `Tip ${i + 1}`}: <span className="font-semibold text-white">{t.horse}</span>{" "}
                          <span className="text-[#22c55e]">{t.odds}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs">
                      {urlDraft.format === "fast-results"
                        ? [...urlDraft.draft.result.placings]
                            .sort((a, b) => a.position - b.position)
                            .slice(0, 4)
                            .map((p) => (
                              <li key={`p-${p.position}-${p.horse}`}>
                                {p.position}. <span className="font-semibold text-white">{p.horse}</span> —{" "}
                                <span className="text-[#22c55e]">{p.sp}</span>
                              </li>
                            ))
                        : [...urlDraft.draft.drivers]
                            .sort((a, b) => a.position - b.position)
                            .slice(0, 4)
                            .map((d) => (
                              <li key={`f1-${d.position}-${d.name}`}>
                                {d.position}. <span className="font-semibold text-white">{d.name}</span>
                                {d.time ? <span className="text-[#22c55e]"> — {d.time}</span> : null}
                              </li>
                            ))}
                    </ul>
                  )}
                </div>
                <R365Button type="button" onClick={() => void persistRacingUrlDraft()} disabled={busy}>
                  {busy ? "Saving…" : "Create template"}
                </R365Button>
                <button
                  type="button"
                  className="w-full rounded-lg border py-2 text-sm font-medium text-[color:var(--text-secondary)] transition-[background-color,border-color,color] duration-200 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                  onClick={closeModal}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {(step === "main" || !usesRacingUrlImport(format)) ? (
              <>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                  Import a <strong className="font-semibold text-[color:var(--text-primary)]">CSV</strong> or{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">JSON</strong> data feed (same as
                  the editor Data feed export)
                  {usesRacingUrlImport(format) ? (
                    <>
                      , pull meeting data from a <strong className="font-semibold text-[color:var(--text-primary)]">URL</strong> (same race API as racecards)
                    </>
                  ) : null}
                  , or start blank and fill fields manually in the editor.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {usesRacingUrlImport(format) ? (
                    <R365Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setUrlErr(null);
                        setStep("url");
                      }}
                      disabled={busy}
                    >
                      Import from URL
                    </R365Button>
                  ) : null}
                  <R365Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                    Import CSV or JSON…
                  </R365Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    className="hidden"
                    onChange={onFeedFileChange}
                  />
                  <R365Button type="button" onClick={() => void createBlankAndGo()} disabled={busy}>
                    Start blank (manual)
                  </R365Button>
                </div>
              </>
            ) : null}

            {(step === "main" || !usesRacingUrlImport(format)) ? (
            <button
              type="button"
              className="mt-4 w-full rounded-lg border py-2 text-sm font-medium text-[color:var(--text-secondary)] transition-[background-color,border-color,color] duration-200 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
              onClick={closeModal}
              disabled={busy}
            >
              Cancel
            </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteTemplateButton({
  format,
  id,
}: {
  format: FormatKey;
  id: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!id.startsWith("tpl-")) return null;

  return (
    <button
      type="button"
      disabled={busy}
      className="text-xs font-medium text-[color:var(--danger)] underline-offset-2 hover:underline disabled:opacity-40"
      onClick={() => {
        if (!confirm(`Delete template “${id}”? This cannot be undone.`)) return;
        setBusy(true);
        void fetch(`/api/templates?format=${encodeURIComponent(format)}&id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        })
          .then(async (r) => {
            if (!r.ok) {
              const d = await parseApiJson<{ error?: string }>(r).catch(() => ({}));
              throw new Error("error" in d && d.error ? d.error : r.statusText);
            }
            router.refresh();
          })
          .catch(() => {})
          .finally(() => setBusy(false));
      }}
    >
      {busy ? "Deleting…" : "Delete template"}
    </button>
  );
}
