"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { ApprovalWorkflowBar } from "@/features/editing-studio/components/ApprovalWorkflowBar";
import { AiActionsPanel } from "@/features/editing-studio/components/AiActionsPanel";
import { EditingStudioCopyTab } from "@/features/editing-studio/components/EditingStudioCopyTab";
import { EditingStudioEditorTablist } from "@/features/editing-studio/components/EditingStudioEditorTablist";
import { EditingStudioExportPanel } from "@/features/editing-studio/components/EditingStudioExportPanel";
import { EditingStudioLiveActions } from "@/features/editing-studio/components/EditingStudioLiveActions";
import { EditingStudioMediaTab } from "@/features/editing-studio/components/EditingStudioMediaTab";
import { PreviewPanel } from "@/features/editing-studio/components/preview/PreviewPanel";
import { RevisionHistoryDrawer } from "@/features/editing-studio/components/RevisionHistoryDrawer";
import { EditingStudioSaveStatusLine } from "@/features/editing-studio/components/EditingStudioSaveStatusLine";
import { EditingStudioSettingsTab } from "@/features/editing-studio/components/EditingStudioSettingsTab";
import { EditingStudioVariantsTab } from "@/features/editing-studio/components/EditingStudioVariantsTab";
import { isEditorTabId, type EditorTabId } from "@/features/editing-studio/editor/editor-types";
import { useEditingProjectEditor } from "@/features/editing-studio/editor/use-editing-project-editor";
import { PREVIEW_PLATFORM_ORDER } from "@/features/editing-studio/preview/preview-platforms";
import type { EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import { formatPlatformLabel, formatStatusLabel } from "@/features/editing-studio/utils/display-labels";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";
import { editingStudioDashboardPath, editingStudioProjectHistoryPath } from "@/features/editing-studio/utils/routes";

function TabPanelPlaceholder({ tab }: { tab: EditorTabId }) {
  const copy: Record<EditorTabId, string> = {
    copy: "Compose headlines, body, and CTAs. Fields below are wired for save / autosave.",
    media: "",
    preview: "",
    variants: "Per-platform headlines, captions, and CTAs. Choose which variant exports for each platform.",
    settings: "",
  };
  return (
    <p className="text-sm text-[color:var(--text-secondary)]" id={`editing-tab-${tab}-desc`}>
      {copy[tab]}
    </p>
  );
}

type Props = {
  initialProject: EditingProject;
};

export function EditingStudioProjectEditorClient({ initialProject }: Props) {
  const projectId = initialProject.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: EditorTabId = isEditorTabId(tabParam) ? tabParam : "copy";

  const setTab = useCallback(
    (tab: EditorTabId) => {
      const u = new URLSearchParams(searchParams.toString());
      u.set("tab", tab);
      router.replace(`${pathname}?${u.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const {
    draft,
    dirty,
    saveStatus,
    saveError,
    lastSavedAt,
    setDraft,
    saveNow,
    discardLocal,
    replaceLocalProject,
  } = useEditingProjectEditor({ projectId, initialProject });

  const [historyOpen, setHistoryOpen] = useState(false);

  const [previewPlatform, setPreviewPlatform] = useState<PlatformType>(
    () => draft.platforms[0] ?? PREVIEW_PLATFORM_ORDER[0],
  );

  useEffect(() => {
    if (draft.platforms.length === 0) {
      setPreviewPlatform(PREVIEW_PLATFORM_ORDER[0]);
      return;
    }
    if (!draft.platforms.includes(previewPlatform)) {
      setPreviewPlatform(draft.platforms[0]!);
    }
  }, [draft.platforms, previewPlatform]);

  const onLeaveEditorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      e.preventDefault();
    }
  }, [dirty]);

  const onDiscard = useCallback(() => {
    if (!dirty) return;
    if (!window.confirm("Discard unsaved changes and reload the last saved version?")) return;
    discardLocal();
  }, [dirty, discardLocal]);

  return (
    <div className="relative space-y-4">
      <a
        href="#editing-studio-main"
        className="pointer-events-none absolute left-2 top-0 z-50 -translate-y-24 rounded-lg bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] opacity-0 shadow-lg transition focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[color:var(--accent)]"
      >
        Skip to editor
      </a>
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between" style={{ borderColor: "var(--border)" }}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">Schedule Studio</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-[color:var(--text-primary)] sm:text-3xl">
            {getEditingProjectDisplayTitle(draft)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <EditingStudioSaveStatusLine
              dirty={dirty}
              saveStatus={saveStatus}
              saveError={saveError}
              lastSavedAt={lastSavedAt}
            />
            <span className="hidden text-[color:var(--text-muted)] sm:inline" aria-hidden>
              ·
            </span>
            <span className="text-xs text-[color:var(--text-muted)]">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border)" }}>
                ⌘S
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border)" }}>
                Ctrl+S
              </kbd>{" "}
              to save
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveNow()}
            disabled={!dirty || saveStatus === "saving"}
            aria-busy={saveStatus === "saving"}
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving…" : "Save now"}
          </button>
          <Link
            href={editingStudioDashboardPath()}
            onClick={onLeaveEditorClick}
            className="text-sm font-medium text-[color:var(--accent)] hover:underline"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <ApprovalWorkflowBar
        projectId={projectId}
        currentProject={draft}
        onProjectUpdated={(p) => replaceLocalProject(p)}
        onSaveDraft={() => void saveNow()}
        onDiscard={onDiscard}
        dirty={dirty}
        saveDisabled={!dirty || saveStatus === "saving"}
      />

      <div className="flex min-h-[min(72vh,800px)] flex-col gap-4 xl:flex-row xl:items-stretch">
        <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-64" aria-label="Project sidebar">
          <Panel title="Project">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Brand</dt>
                <dd className="text-[color:var(--text-primary)]">{draft.brand?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Status</dt>
                <dd>
                  <span
                    className="inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    {formatStatusLabel(draft.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Content type</dt>
                <dd className="capitalize text-[color:var(--text-secondary)]">{draft.contentType.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Revision</dt>
                <dd className="font-mono text-xs text-[color:var(--text-secondary)]">{draft.revision}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Target platforms">
            {draft.platforms.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">None selected</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {draft.platforms.map((p) => (
                  <li
                    key={p}
                    className="rounded-md border px-2 py-0.5 text-xs capitalize"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    {formatPlatformLabel(p)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Export JSON">
            <EditingStudioExportPanel draft={draft} />
          </Panel>

          <Panel title="Live Control">
            <EditingStudioLiveActions project={draft} onBeforeNavigate={onLeaveEditorClick} />
          </Panel>

          <Panel title="Assets">
            {draft.assets.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No assets yet — add from the Media tab.</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-auto text-sm text-[color:var(--text-secondary)]">
                {draft.assets.map((a) => (
                  <li key={a.id} className="truncate">
                    {a.label || a.kind}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="AI writing tools">
            <div className="max-h-[min(70vh,560px)] overflow-y-auto pr-0.5">
              <AiActionsPanel draft={draft} setDraft={setDraft} previewPlatform={previewPlatform} />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="rounded-lg border px-3 py-2 text-left text-sm font-medium text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]"
                style={{ borderColor: "var(--border)" }}
              >
                Revision history…
              </button>
              <Link
                href={editingStudioProjectHistoryPath(projectId)}
                onClick={onLeaveEditorClick}
                className="text-xs text-[color:var(--accent)] hover:underline"
              >
                Open history page →
              </Link>
            </div>
          </Panel>
        </aside>

        <section
          id="editing-studio-main"
          className="flex min-h-0 min-w-0 flex-1 flex-col scroll-mt-4"
          aria-label="Editor workspace"
          tabIndex={-1}
        >
          <EditingStudioEditorTablist activeTab={activeTab} onTabChange={setTab} />

          <div
            className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border bg-[var(--surface)] p-4 sm:p-5"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
            role="tabpanel"
            aria-labelledby={`editing-tab-${activeTab}`}
            id={`editing-tabpanel-${activeTab}`}
          >
            {activeTab !== "copy" &&
            activeTab !== "variants" &&
            activeTab !== "media" &&
            activeTab !== "preview" &&
            activeTab !== "settings" ? (
              <TabPanelPlaceholder tab={activeTab} />
            ) : null}

            {activeTab === "copy" ? <EditingStudioCopyTab draft={draft} setDraft={setDraft} /> : null}
            {activeTab === "media" ? (
              <EditingStudioMediaTab projectId={projectId} draft={draft} setDraft={setDraft} />
            ) : null}
            {activeTab === "preview" ? (
              <div className="mx-auto max-w-xl">
                <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Live preview</h2>
                <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                  Switch platforms to compare layouts. The sidebar shows the same preview while you edit.
                </p>
                <div className="mt-4">
                  <PreviewPanel
                    draft={draft}
                    previewPlatform={previewPlatform}
                    onPreviewPlatformChange={setPreviewPlatform}
                  />
                </div>
              </div>
            ) : null}
            {activeTab === "variants" ? <EditingStudioVariantsTab draft={draft} setDraft={setDraft} /> : null}
            {activeTab === "settings" ? <EditingStudioSettingsTab draft={draft} setDraft={setDraft} /> : null}
          </div>
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-80" aria-label="Live preview">
          <Panel title="Live preview">
            <PreviewPanel
              draft={draft}
              previewPlatform={previewPlatform}
              onPreviewPlatformChange={setPreviewPlatform}
              compact
            />
          </Panel>
        </aside>
      </div>

      <RevisionHistoryDrawer
        projectId={projectId}
        currentProject={draft}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRollbackComplete={(p) => replaceLocalProject(p)}
      />
    </div>
  );
}
