"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import { buildEditingProjectPatch, editingProjectsEqual } from "@/features/editing-studio/editor/build-edit-patch";
import type { SaveStatus } from "@/features/editing-studio/editor/editor-types";
import { getEditingStudioClientHeaders } from "@/features/editing-studio/lib/editing-client-headers";
import type { EditingProject } from "@/features/editing-studio/types/domain";

const AUTOSAVE_MS = 2200;

type UseEditingProjectEditorOptions = {
  projectId: string;
  initialProject: EditingProject;
};

type UseEditingProjectEditorResult = {
  baseline: EditingProject;
  draft: EditingProject;
  dirty: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
  updateDraft: (updater: (prev: EditingProject) => EditingProject) => void;
  saveNow: () => Promise<void>;
  discardLocal: () => void;
  /** Replace local draft/baseline after server-side actions (e.g. rollback). */
  replaceLocalProject: (project: EditingProject) => void;
};

export function useEditingProjectEditor({
  projectId,
  initialProject,
}: UseEditingProjectEditorOptions): UseEditingProjectEditorResult {
  const [baseline, setBaseline] = useState<EditingProject>(initialProject);
  const [draft, setDraft] = useState<EditingProject>(initialProject);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialProject.updatedAt);

  const saveInFlight = useRef(false);
  const pendingAfterSave = useRef(false);
  const draftSnapshotAtSaveStart = useRef<EditingProject>(initialProject);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistRef = useRef<() => Promise<void>>(async () => {});
  /** Keep latest draft/baseline for persist without re-creating the callback on every keystroke. */
  const draftRef = useRef(draft);
  const baselineRef = useRef(baseline);
  draftRef.current = draft;
  baselineRef.current = baseline;

  const dirty = useMemo(() => !editingProjectsEqual(draft, baseline), [draft, baseline]);

  const updateDraft = useCallback((updater: (prev: EditingProject) => EditingProject) => {
    setDraft((prev) => updater(prev));
  }, []);

  const persist = useCallback(async () => {
    const d = draftRef.current;
    const b = baselineRef.current;
    const patch = buildEditingProjectPatch(d, b);
    if (Object.keys(patch).length === 0) {
      setSaveStatus("idle");
      return;
    }

    if (saveInFlight.current) {
      pendingAfterSave.current = true;
      return;
    }

    draftSnapshotAtSaveStart.current = d;
    saveInFlight.current = true;
    setSaveStatus("saving");
    setSaveError(null);

    try {
      const res = await fetch(`/api/editing-studio/projects/${encodeURIComponent(projectId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getEditingStudioClientHeaders(),
        },
        body: JSON.stringify(patch),
      });
      const data = await parseApiJson<{ project?: EditingProject; error?: string }>(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      }
      if (!data.project) {
        throw new Error("Invalid save response");
      }

      const saved = data.project;
      const atStart = draftSnapshotAtSaveStart.current;

      setBaseline(saved);
      setDraft((prev) => {
        if (editingProjectsEqual(prev, atStart)) {
          return saved;
        }
        return {
          ...prev,
          revision: saved.revision,
          updatedAt: saved.updatedAt,
        };
      });
      setLastSavedAt(saved.updatedAt);
      setSaveStatus("saved");
      setSaveError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
      setSaveStatus("error");
    } finally {
      saveInFlight.current = false;
      if (pendingAfterSave.current) {
        pendingAfterSave.current = false;
        void persistRef.current();
      }
    }
  }, [projectId]);

  persistRef.current = persist;

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2200);
    return () => clearTimeout(t);
  }, [saveStatus]);

  useEffect(() => {
    if (!dirty) {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
      return;
    }

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = setTimeout(() => {
      autosaveTimer.current = null;
      void persist();
    }, AUTOSAVE_MS);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
    };
  }, [dirty, draft, persist]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!editingProjectsEqual(draft, baseline)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft, baseline]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S");
      if (!isSave) return;
      e.preventDefault();
      void persist();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  const saveNow = useCallback(async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    await persist();
  }, [persist]);

  const discardLocal = useCallback(() => {
    setDraft(baseline);
    setSaveError(null);
    setSaveStatus("idle");
  }, [baseline]);

  const replaceLocalProject = useCallback((project: EditingProject) => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    pendingAfterSave.current = false;
    saveInFlight.current = false;
    setBaseline(project);
    setDraft(project);
    setLastSavedAt(project.updatedAt);
    setSaveError(null);
    setSaveStatus("idle");
  }, []);

  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    pendingAfterSave.current = false;
    saveInFlight.current = false;
    setBaseline(initialProject);
    setDraft(initialProject);
    setLastSavedAt(initialProject.updatedAt);
    setSaveError(null);
    setSaveStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when switching projects by id, not on parent re-fetch of the same project.
  }, [initialProject.id]);

  return {
    baseline,
    draft,
    dirty,
    saveStatus,
    saveError,
    lastSavedAt,
    setDraft,
    updateDraft,
    saveNow,
    discardLocal,
    replaceLocalProject,
  };
}
