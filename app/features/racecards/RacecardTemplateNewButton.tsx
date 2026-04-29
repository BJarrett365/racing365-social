"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { R365Button } from "@/app/components/R365Button";
import { parseDataFeedKeyValueCsv } from "@/app/lib/data-feed-csv";
import { PENDING_TEMPLATE_FEED_STORAGE_KEY, parseDataFeedJsonDocument } from "@/app/lib/data-feed-json";
import { parseApiJson } from "@/app/lib/parse-api-json";
import {
  racecardTemplatePreviewToSnapshot,
  type RacecardTemplatePreview,
} from "@/app/lib/parseRacecardUrl";
import type { RacecardSnapshot } from "@/types";
import { RacecardImportPreview } from "@/app/features/racecards/RacecardImportPreview";
import { RacecardUrlImportForm } from "@/app/features/racecards/RacecardUrlImportForm";

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

type Step = "main" | "url" | "preview";

export function RacecardTemplateNewButton({
  editorBasePath = "/editor",
}: {
  editorBasePath?: "/editor" | "/landscape/editor";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>("main");
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<RacecardTemplatePreview | null>(null);
  const withEditorBase = (editorPath?: string) =>
    editorPath?.startsWith("/editor/") ? editorPath.replace("/editor", editorBasePath) : editorPath;

  const resetModal = () => {
    setStep("main");
    setErr(null);
    setUrlErr(null);
    setPreview(null);
  };

  const closeModal = () => {
    if (!busy) {
      setModalOpen(false);
      resetModal();
    }
  };

  const createBlankAndGo = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "racecard" }),
      });
      const data = await parseApiJson<{ error?: string; editorPath?: string; id?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Create failed");
      setModalOpen(false);
      resetModal();
      if (data.editorPath) router.push(withEditorBase(data.editorPath) ?? data.editorPath);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const persistImported = async (p: RacecardTemplatePreview, navigateToEditor: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "racecard" }),
      });
      const data = await parseApiJson<{ error?: string; editorPath?: string; id?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Create failed");
      const id = data.id;
      if (!id) throw new Error("Missing template id");
      const snap: RacecardSnapshot = racecardTemplatePreviewToSnapshot(p, id);
      const put = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "racecard", racecard: snap }),
      });
      const putData = await parseApiJson<{ error?: string }>(put);
      if (!put.ok) throw new Error(putData.error || "Save failed");
      setModalOpen(false);
      resetModal();
      if (navigateToEditor && data.editorPath) {
        router.push(withEditorBase(data.editorPath) ?? data.editorPath);
      }
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
          if (feedFmt && feedFmt !== "racecard") {
            throw new Error(
              `This file is for format “${feedFmt}”. Open ${feedFmt} templates or use a matching feed.`,
            );
          }
          const res = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format: "racecard" }),
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
          resetModal();
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

  const handleFetchParse = async (url: string) => {
    setUrlErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/racecards/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await parseApiJson<{ error?: string; preview?: RacecardTemplatePreview }>(res);
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      if (!data.preview) throw new Error("We found the page but could not parse a racecard");
      setPreview(data.preview);
      setStep("preview");
    } catch (e) {
      setUrlErr(e instanceof Error ? e.message : "We could not fetch data from this page");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <R365Button
        type="button"
        onClick={() => {
          setErr(null);
          resetModal();
          setModalOpen(true);
        }}
        disabled={busy}
      >
        {busy ? "Creating…" : "New template"}
      </R365Button>

      {modalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="racecard-new-template-title"
          onClick={() => {
            if (!busy) closeModal();
          }}
        >
          <div className="ui-modal relative z-10 w-full max-w-md p-5" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="racecard-new-template-title" className="text-lg font-semibold text-[color:var(--text-primary)]">
              New template
            </h2>
            {err ? <p className="mt-2 text-xs font-medium text-[color:var(--danger)]">{err}</p> : null}

            {step === "main" ? (
              <>
                <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                  Import a <strong className="font-semibold text-[color:var(--text-primary)]">CSV</strong> or{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">JSON</strong> data feed, pull a
                  racecard from a <strong className="font-semibold text-[color:var(--text-primary)]">URL</strong>, or
                  start blank and fill fields manually in the editor.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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

            {step === "url" ? (
              <div className="space-y-3">
                <RacecardUrlImportForm
                  busy={busy}
                  error={urlErr}
                  onFetchParse={handleFetchParse}
                  onBack={() => {
                    setUrlErr(null);
                    setStep("main");
                  }}
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

            {step === "preview" && preview ? (
              <RacecardImportPreview
                preview={preview}
                busy={busy}
                onUseTemplate={() => void persistImported(preview, true)}
                onSaveContinue={() => void persistImported(preview, false)}
                onBack={() => {
                  setPreview(null);
                  setStep("url");
                }}
                onCancel={closeModal}
              />
            ) : null}

            {step === "main" ? (
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
