"use client";

import { useEffect, useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";

export type LibraryImageListItem = { relPath: string; label: string };

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (relPath: string) => void;
};

export function LibraryImagePickerModal({ open, onClose, onPick }: Props) {
  const [items, setItems] = useState<LibraryImageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetch(studioApiPath("/api/language/articles/library-images"))
      .then((r) => r.json())
      .then((d: { items?: LibraryImageListItem[]; error?: string }) => {
        if (cancelled) return;
        if (d.error) setErr(d.error);
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load library images.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter((row) => row.relPath.toLowerCase().includes(n) || row.label.toLowerCase().includes(n));
  }, [items, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mr-library-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h2 id="mr-library-picker-title" className="text-lg font-bold text-[color:var(--text-primary)]">
            Pick from Media Library
          </h2>
          <R365Button type="button" variant="ghost" onClick={onClose}>
            Close
          </R365Button>
        </div>
        <div className="border-b p-3" style={{ borderColor: "var(--border)" }}>
          <input
            className={inputClass}
            style={{ borderColor: "var(--border)", background: "var(--surface-muted)", color: "var(--text-primary)" }}
            placeholder="Filter by path or filename…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? <p className="text-sm text-[color:var(--text-muted)]">Loading…</p> : null}
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          {!loading && !err && filtered.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">
              No images found. Generate one below or use the{" "}
              <a href={withAppPathPrefix("/tools/image-editor")} className="text-emerald-300 underline">
                Image Editor
              </a>
              .
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((row) => (
              <button
                key={row.relPath}
                type="button"
                className="group flex flex-col overflow-hidden rounded-xl border text-left transition hover:border-emerald-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
                onClick={() => {
                  onPick(row.relPath);
                  onClose();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withAppPathPrefix(`/api/file?rel=${encodeURIComponent(row.relPath)}`)}
                  alt=""
                  className="h-28 w-full object-cover"
                />
                <p className="truncate p-2 font-mono text-[10px] text-[color:var(--text-muted)]">{row.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function libraryImagePreviewUrl(relOrUrl: string): string {
  const value = relOrUrl.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/api/")) return withAppPathPrefix(value);
  return withAppPathPrefix(`/api/file?rel=${encodeURIComponent(value.replace(/^\/+/, ""))}`);
}
