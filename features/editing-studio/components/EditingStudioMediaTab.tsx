"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { AssetCropModal } from "@/features/editing-studio/components/media/AssetCropModal";
import { ImageEditPreview } from "@/features/editing-studio/components/media/ImageEditPreview";
import { mergeImageEditSettings, getImageEditSettings } from "@/features/editing-studio/lib/asset-image-meta";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import type { EditingAsset, EditingProject } from "@/features/editing-studio/types/domain";
import type { ImageEditSettingsV1 } from "@/features/editing-studio/types/image-edit";
import { EditingStudioMediaVideoSection } from "@/features/editing-studio/components/EditingStudioMediaVideoSection";
import { editingAssetImageSrc } from "@/features/editing-studio/utils/editing-asset-src";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

type Props = {
  projectId: string;
  draft: EditingProject;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
};

function nowIso(): string {
  return new Date().toISOString();
}

type LibraryItem = { relPath: string; label: string };

export function EditingStudioMediaTab({ projectId, draft, setDraft }: Props) {
  const imageAssets = useMemo(
    () => draft.assets.filter((a) => a.kind === "image" && (a.relPath?.trim() || a.url?.trim())),
    [draft.assets],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => imageAssets[0]?.id ?? null);

  useEffect(() => {
    if (imageAssets.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !imageAssets.some((a) => a.id === selectedId)) {
      setSelectedId(imageAssets[0].id);
    }
  }, [imageAssets, selectedId]);

  const selected = useMemo(
    () => imageAssets.find((a) => a.id === selectedId) ?? imageAssets[0],
    [imageAssets, selectedId],
  );

  const selectedSrc = selected ? editingAssetImageSrc(selected) : null;
  const editSettings = selected ? getImageEditSettings(selected) : null;

  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryState, setLibraryState] = useState<"idle" | "loading" | "error">("idle");
  const [cropOpen, setCropOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const patchAsset = useCallback(
    (assetId: string, fn: (a: EditingAsset) => EditingAsset) => {
      const ts = nowIso();
      setDraft((p) => ({
        ...p,
        assets: p.assets.map((a) => (a.id === assetId ? fn(a) : a)),
        updatedAt: ts,
      }));
    },
    [setDraft],
  );

  const onUpload = async (file: File, mode: "add" | "replace") => {
    setUploadState("uploading");
    setUploadMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/editing-studio/projects/${encodeURIComponent(projectId)}/assets/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await parseApiJson<{ asset?: EditingAsset; error?: string }>(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
      }
      if (!data.asset) {
        throw new Error("Invalid upload response");
      }
      const ts = nowIso();
      if (mode === "add") {
        setDraft((p) => ({
          ...p,
          assets: [...p.assets, data.asset!],
          updatedAt: ts,
        }));
        setSelectedId(data.asset!.id);
      } else if (selected) {
        const newRel = data.asset!.relPath!;
        patchAsset(selected.id, (a) => ({
          ...a,
          relPath: newRel,
          url: undefined,
          mimeType: data.asset!.mimeType,
          byteSize: data.asset!.byteSize,
          label: a.label,
          updatedAt: ts,
          meta: {
            ...(a.meta as Record<string, unknown>),
            originalRelPath: (a.meta as { originalRelPath?: string })?.originalRelPath ?? a.relPath,
            replacedAt: ts,
          },
        }));
      }
      setUploadState("idle");
    } catch (e) {
      setUploadState("error");
      setUploadMessage(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const loadLibrary = async () => {
    setLibraryState("loading");
    try {
      const res = await fetch("/api/editing-studio/library/images");
      const data = await parseApiJson<{ items?: LibraryItem[]; error?: string }>(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load library");
      }
      setLibraryItems(data.items ?? []);
      setLibraryState("idle");
    } catch (e) {
      setLibraryState("error");
      setUploadMessage(e instanceof Error ? e.message : "Library error");
    }
  };

  const addFromLibrary = (item: LibraryItem) => {
    const ts = nowIso();
    const asset: EditingAsset = {
      id: newEditingStudioId("ast"),
      kind: "image",
      label: item.label,
      relPath: item.relPath,
      createdAt: ts,
      updatedAt: ts,
      meta: { fromLibrary: true, libraryRelPath: item.relPath },
    };
    setDraft((p) => ({
      ...p,
      assets: [...p.assets, asset],
      updatedAt: ts,
    }));
    setSelectedId(asset.id);
    setLibraryOpen(false);
  };

  const useExtractedHero = () => {
    const hero =
      draft.assets.find((a) => a.kind === "image" && (a.meta as { fromImport?: boolean })?.fromImport) ||
      draft.assets.find((a) => a.kind === "image" && a.label?.toLowerCase() === "hero");
    if (!hero) {
      setUploadMessage("No imported hero image found on this project.");
      setUploadState("error");
      return;
    }
    setSelectedId(hero.id);
    setUploadMessage(null);
    setUploadState("idle");
  };

  const setHeroThumbnail = () => {
    if (!selected?.relPath?.trim()) return;
    const ts = nowIso();
    setDraft((p) => ({
      ...p,
      thumbnailRel: selected.relPath,
      updatedAt: ts,
    }));
  };

  const applyEditPatch = (patch: Partial<ImageEditSettingsV1>) => {
    if (!selected) return;
    const ts = nowIso();
    patchAsset(selected.id, (a) => mergeImageEditSettings(a, patch, ts));
  };

  const heroAssetPresent =
    !!draft.assets.find((a) => a.kind === "image" && (a.meta as { fromImport?: boolean })?.fromImport) ||
    !!draft.assets.find((a) => a.kind === "image" && a.label?.toLowerCase() === "hero");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Media</h2>
        <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
          Lightweight image prep: crop presets, focal point, safe zones, and quick promo overlays. Original files stay
          on disk; settings are saved on the asset.
        </p>
      </div>

      {uploadState === "error" && uploadMessage ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
          {uploadMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onUpload(f, "add");
          }}
        />
        <button
          type="button"
          disabled={uploadState === "uploading"}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          {uploadState === "uploading" ? "Uploading…" : "Upload image"}
        </button>

        <button
          type="button"
          onClick={() => {
            setLibraryOpen((o) => !o);
            if (!libraryOpen) void loadLibrary();
          }}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
          style={{ borderColor: "var(--border)" }}
        >
          {libraryOpen ? "Hide library" : "Media library"}
        </button>

        <button
          type="button"
          disabled={!heroAssetPresent}
          onClick={useExtractedHero}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
          style={{ borderColor: "var(--border)" }}
          title={heroAssetPresent ? "Select the hero from import" : "No hero on this project"}
        >
          Use extracted hero
        </button>

        <input
          ref={replaceRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && selected) void onUpload(f, "replace");
          }}
        />
        <button
          type="button"
          disabled={!selected || uploadState === "uploading"}
          onClick={() => replaceRef.current?.click()}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
          style={{ borderColor: "var(--border)" }}
        >
          Replace image
        </button>

        <button
          type="button"
          disabled={!selected?.relPath}
          onClick={setHeroThumbnail}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
          style={{ borderColor: "var(--border)" }}
        >
          Use as project hero
        </button>
      </div>

      {libraryOpen ? (
        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Library</p>
          {libraryState === "loading" ? (
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Loading…</p>
          ) : libraryState === "error" ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">Could not load library.</p>
          ) : libraryItems.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              No images under <code className="text-xs">{"output/images/library"}</code>. Add files there to browse.
            </p>
          ) : (
            <ul className="mt-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
              {libraryItems.map((item) => (
                <li key={item.relPath}>
                  <button
                    type="button"
                    onClick={() => addFromLibrary(item)}
                    className="w-full overflow-hidden rounded-lg border text-left hover:opacity-90"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/file?rel=${encodeURIComponent(item.relPath)}`}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    <span className="block truncate px-1 py-0.5 text-[10px] text-[color:var(--text-muted)]">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {imageAssets.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">No image assets yet — upload or pick from the library.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">Images</p>
            <ul className="mt-2 space-y-1">
              {imageAssets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm ${
                      selected?.id === a.id
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
                        : "border-transparent hover:bg-[var(--surface-hover)]"
                    }`}
                    style={{ borderColor: selected?.id === a.id ? undefined : "var(--border)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editingAssetImageSrc(a) ?? ""}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 truncate">{a.label || "Image"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selected && selectedSrc && editSettings ? (
            <div className="min-w-0 space-y-4">
              <ImageEditPreview src={selectedSrc} settings={editSettings} className="max-w-md" />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCropOpen(true)}
                  className="rounded-lg bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]"
                >
                  Crop & focal…
                </button>
              </div>

              <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Adjust
                </legend>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
                  Brightness ({editSettings.brightness})
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={editSettings.brightness}
                    onChange={(e) => applyEditPatch({ brightness: Number(e.target.value) })}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
                  Contrast ({editSettings.contrast})
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={editSettings.contrast}
                    onChange={(e) => applyEditPatch({ contrast: Number(e.target.value) })}
                    className="mt-1 w-full"
                  />
                </label>
              </fieldset>

              <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Background
                </legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={editSettings.blurBackground}
                    onChange={(e) => applyEditPatch({ blurBackground: e.target.checked })}
                  />
                  Blur background fill (letterbox)
                </label>
                <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
                  Extend mode
                  <select
                    className={inputClass}
                    style={inputStyle}
                    value={editSettings.extendMode}
                    onChange={(e) =>
                      applyEditPatch({ extendMode: e.target.value as ImageEditSettingsV1["extendMode"] })
                    }
                  >
                    <option value="blur">Blur (behind crop)</option>
                    <option value="color">Solid color</option>
                    <option value="none">None</option>
                  </select>
                </label>
                {editSettings.extendMode === "color" ? (
                  <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
                    Canvas color
                    <input
                      type="color"
                      className="mt-1 h-9 w-full max-w-[120px] cursor-pointer rounded border p-0"
                      style={{ borderColor: "var(--border)" }}
                      value={editSettings.extendColor ?? "#111827"}
                      onChange={(e) => applyEditPatch({ extendColor: e.target.value })}
                    />
                  </label>
                ) : null}
              </fieldset>

              <fieldset className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
                  Overlays
                </legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={editSettings.gradientOverlay}
                    onChange={(e) => applyEditPatch({ gradientOverlay: e.target.checked })}
                  />
                  Bottom gradient
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={editSettings.safeZoneOverlay}
                    onChange={(e) => applyEditPatch({ safeZoneOverlay: e.target.checked })}
                  />
                  Safe zone guides
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={editSettings.textBadge}
                    onChange={(e) => applyEditPatch({ textBadge: e.target.checked })}
                  />
                  Text badge (preview)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={editSettings.logoBadge}
                    onChange={(e) => applyEditPatch({ logoBadge: e.target.checked })}
                  />
                  Logo badge (preview)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={editSettings.ctaChip}
                    onChange={(e) => applyEditPatch({ ctaChip: e.target.checked })}
                  />
                  CTA chip (preview)
                </label>
              </fieldset>

              <p className="text-xs text-[color:var(--text-muted)]">
                Original file:{" "}
                <code className="text-[10px]">{(selected.meta as { originalRelPath?: string })?.originalRelPath ?? selected.relPath}</code>
              </p>
            </div>
          ) : null}
        </div>
      )}

      {cropOpen && selected && selectedSrc ? (
        <AssetCropModal
          key={selected.id}
          src={selectedSrc}
          initial={getImageEditSettings(selected)}
          onClose={() => setCropOpen(false)}
          onSave={(s) => {
            const id = selected.id;
            const ts = nowIso();
            patchAsset(id, (a) => mergeImageEditSettings(a, s, ts));
            setCropOpen(false);
          }}
        />
      ) : null}

      <EditingStudioMediaVideoSection projectId={projectId} draft={draft} setDraft={setDraft} />
    </div>
  );
}
