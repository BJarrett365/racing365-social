"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { EditingStudioErrorDisplay } from "@/features/editing-studio/components/EditingStudioErrorDisplay";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import { getEditorialDefaultsForBrand } from "@/features/editing-studio/lib/brand-defaults";
import type { ContentType, EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import { EDITING_STUDIO_PLATFORM_FILTERS } from "@/features/editing-studio/utils/filter-options";
import { editingStudioDashboardPath, editingStudioProjectPath } from "@/features/editing-studio/utils/routes";
import { manualProjectCreateSchema, type ManualProjectCreateInput } from "@/features/editing-studio/validators/editing-studio-schemas";
import type { ImportUrlResponse } from "@/features/editing-studio/types/import-url";

const CONTENT_TYPES: ContentType[] = [
  "article_promo",
  "link_post",
  "image_post",
  "video_post",
  "story_post",
  "shorts_promo",
];

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

function contentTypeLabel(c: ContentType): string {
  return c.replace(/_/g, " ");
}

function platformLabel(p: PlatformType): string {
  return p.replace(/_/g, " ");
}

type ManualFieldKey =
  | "title"
  | "publicHeadline"
  | "brand"
  | "contentType"
  | "summary"
  | "bodyNotes"
  | "sourceUrl"
  | "platforms";

export function EditingStudioNewProjectClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const mode = searchParams.get("mode");
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [brandImport, setBrandImport] = useState("");
  const [contentTypeImport, setContentTypeImport] = useState<ContentType>("article_promo");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<{
    url: string;
    brand: string;
    contentType: ContentType;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [publicHeadline, setPublicHeadline] = useState("");
  const [brandManual, setBrandManual] = useState("");
  const [contentTypeManual, setContentTypeManual] = useState<ContentType>("article_promo");
  const [summary, setSummary] = useState("");
  const [bodyNotes, setBodyNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [platformsManual, setPlatformsManual] = useState<PlatformType[]>([]);
  const contentTypeManualTouched = useRef(false);
  const platformsManualTouched = useRef(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ManualFieldKey, string>>>({});

  useEffect(() => {
    if (mode === "url") {
      urlInputRef.current?.focus();
    }
  }, [mode]);

  const applyBrandDefaults = useCallback(() => {
    const d = getEditorialDefaultsForBrand(brandManual);
    if (!platformsManualTouched.current && d.platforms?.length) {
      setPlatformsManual([...d.platforms]);
    }
    if (!contentTypeManualTouched.current && d.contentType) {
      setContentTypeManual(d.contentType);
    }
  }, [brandManual]);

  const runImport = useCallback(
    async (payload: { url: string; brand: string; contentType: ContentType }) => {
      setImportBusy(true);
      setImportError(null);
      setLastPayload(payload);
      try {
        const res = await fetch("/api/editing/import/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: payload.url.trim(),
            ...(payload.brand.trim() ? { brand: payload.brand.trim() } : {}),
            contentType: payload.contentType,
          }),
        });
        const data = await parseApiJson<ImportUrlResponse & { error?: string }>(res);
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Import failed");
        }
        if (!data.project?.id) {
          throw new Error("Invalid response from server");
        }
        router.push(editingStudioProjectPath(data.project.id));
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "Import failed");
      } finally {
        setImportBusy(false);
      }
    },
    [router],
  );

  const onImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setImportError("Enter a source URL.");
      return;
    }
    void runImport({ url, brand: brandImport.trim(), contentType: contentTypeImport });
  };

  const retryImport = () => {
    if (lastPayload) void runImport(lastPayload);
  };

  const togglePlatform = (p: PlatformType) => {
    platformsManualTouched.current = true;
    setPlatformsManual((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setFieldErrors({});

    const brandTrim = brandManual.trim();
    const d = getEditorialDefaultsForBrand(brandTrim);
    let platformsResolved = platformsManual;
    let contentTypeResolved = contentTypeManual;
    if (!platformsManualTouched.current && platformsResolved.length === 0 && d.platforms?.length) {
      platformsResolved = [...d.platforms];
    }
    if (!contentTypeManualTouched.current && d.contentType) {
      contentTypeResolved = d.contentType;
    }

    const raw: ManualProjectCreateInput = {
      title: title.trim(),
      publicHeadline: publicHeadline.trim(),
      brand: brandTrim,
      contentType: contentTypeResolved,
      summary: summary.trim(),
      bodyNotes,
      sourceUrl: sourceUrl.trim() || undefined,
      platforms: platformsResolved,
    };

    const parsed = manualProjectCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const next: Partial<Record<ManualFieldKey, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && next[key as ManualFieldKey] === undefined) {
          next[key as ManualFieldKey] = issue.message;
        }
      }
      setFieldErrors(next);
      setManualError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }

    void (async () => {
      setManualBusy(true);
      try {
        const res = await fetch("/api/editing-studio/projects/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const data = await parseApiJson<{ project?: EditingProject; error?: string }>(res);
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not create project");
        }
        if (!data.project?.id) {
          throw new Error("Invalid response from server");
        }
        router.push(editingStudioProjectPath(data.project.id));
      } catch (err) {
        setManualError(err instanceof Error ? err.message : "Could not create project");
      } finally {
        setManualBusy(false);
      }
    })();
  };

  const fieldErr = (k: ManualFieldKey) => fieldErrors[k];

  return (
    <EditingStudioPageFrame
      title="New project"
      description="Import from a URL or create a blank draft with headline, summary, and target platforms."
      actions={
        <Link
          href={editingStudioDashboardPath()}
          className="text-sm font-medium text-[color:var(--accent)] hover:underline"
        >
          ← Back to dashboard
        </Link>
      }
    >
      <form onSubmit={onImportSubmit} className="space-y-6">
        {importError ? (
          <EditingStudioErrorDisplay message={importError} onRetry={lastPayload ? retryImport : undefined} />
        ) : null}

        <Panel title="Create from URL">
          <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
            We fetch the page server-side, extract Open Graph / article metadata where possible, and save the article
            body in project metadata. Missing fields are OK.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] lg:col-span-2">
              Source URL *
              <input
                ref={urlInputRef}
                className={inputClass}
                style={inputStyle}
                type="url"
                inputMode="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={importBusy}
                autoComplete="url"
                required
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Brand (optional)
              <input
                className={inputClass}
                style={inputStyle}
                type="text"
                placeholder="e.g. Football365"
                value={brandImport}
                onChange={(e) => setBrandImport(e.target.value)}
                disabled={importBusy}
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Default content type
              <select
                className={inputClass}
                style={inputStyle}
                value={contentTypeImport}
                onChange={(e) => setContentTypeImport(e.target.value as ContentType)}
                disabled={importBusy}
              >
                {CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {contentTypeLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={importBusy}
              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50"
            >
              {importBusy ? "Importing…" : "Import and create project"}
            </button>
            {importBusy ? (
              <span className="self-center text-sm text-[color:var(--text-muted)]">Fetching article…</span>
            ) : null}
          </div>
        </Panel>
      </form>

      <form onSubmit={onManualSubmit} className="mt-6 space-y-6">
        {manualError ? (
          <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-primary)]">
            {manualError}
          </div>
        ) : null}

        <Panel title="Create manually">
          <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
            Start a draft without a source URL. You can add assets and copy on the project page.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] lg:col-span-2">
              Internal project title *
              <input
                className={inputClass}
                style={inputStyle}
                type="text"
                placeholder="Short label for your list / admin"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={manualBusy}
                autoComplete="off"
              />
              {fieldErr("title") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("title")}</span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] lg:col-span-2">
              Public headline *
              <input
                className={inputClass}
                style={inputStyle}
                type="text"
                placeholder="Headline for social / promo"
                value={publicHeadline}
                onChange={(e) => setPublicHeadline(e.target.value)}
                disabled={manualBusy}
              />
              {fieldErr("publicHeadline") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("publicHeadline")}</span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Brand *
              <input
                className={inputClass}
                style={inputStyle}
                type="text"
                placeholder="e.g. Football365"
                value={brandManual}
                onChange={(e) => setBrandManual(e.target.value)}
                onBlur={() => applyBrandDefaults()}
                disabled={manualBusy}
              />
              {fieldErr("brand") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("brand")}</span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Content type *
              <select
                className={inputClass}
                style={inputStyle}
                value={contentTypeManual}
                onChange={(e) => {
                  contentTypeManualTouched.current = true;
                  setContentTypeManual(e.target.value as ContentType);
                }}
                disabled={manualBusy}
              >
                {CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {contentTypeLabel(c)}
                  </option>
                ))}
              </select>
              {fieldErr("contentType") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("contentType")}</span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] lg:col-span-2">
              Summary *
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                style={inputStyle}
                placeholder="Short summary for reviewers"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={manualBusy}
              />
              {fieldErr("summary") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("summary")}</span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] lg:col-span-2">
              Body / notes *
              <textarea
                className={`${inputClass} min-h-[140px] resize-y`}
                style={inputStyle}
                placeholder="Full notes, article body, or briefing for editors"
                value={bodyNotes}
                onChange={(e) => setBodyNotes(e.target.value)}
                disabled={manualBusy}
              />
              {fieldErr("bodyNotes") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("bodyNotes")}</span>
              ) : null}
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] lg:col-span-2">
              Source URL (optional)
              <input
                className={inputClass}
                style={inputStyle}
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={manualBusy}
              />
              {fieldErr("sourceUrl") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("sourceUrl")}</span>
              ) : null}
            </label>

            <div className="lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Target platforms *
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {EDITING_STUDIO_PLATFORM_FILTERS.map((p) => {
                  const checked = platformsManual.includes(p);
                  return (
                    <label
                      key={p}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-[color:var(--border)]"
                        checked={checked}
                        onChange={() => togglePlatform(p)}
                        disabled={manualBusy}
                      />
                      {platformLabel(p)}
                    </label>
                  );
                })}
              </div>
              {fieldErr("platforms") ? (
                <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErr("platforms")}</span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={manualBusy}
              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50"
            >
              {manualBusy ? "Saving…" : "Create draft project"}
            </button>
            <Link
              href={editingStudioDashboardPath()}
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-muted)]"
              style={{ borderColor: "var(--border)" }}
            >
              Cancel
            </Link>
            {manualBusy ? (
              <span className="text-sm text-[color:var(--text-muted)]">Creating project…</span>
            ) : null}
          </div>
        </Panel>
      </form>
    </EditingStudioPageFrame>
  );
}
