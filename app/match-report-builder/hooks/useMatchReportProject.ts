"use client";

import { useCallback, useState } from "react";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { MatchReportProject, PatchMatchReportProjectInput } from "@/app/lib/match-report/types";

export function useMatchReportProject(initialId?: string) {
  const [project, setProject] = useState<MatchReportProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(id)}`));
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Failed to load project");
      setProject(data.project);
      return data.project;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load project";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const patchProject = useCallback(async (id: string, patch: PatchMatchReportProjectInput) => {
    const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Patch failed");
    setProject(data.project);
    return data.project;
  }, []);

  const refresh = useCallback(async () => {
    if (!project?.id && !initialId) return null;
    return loadProject(project?.id ?? initialId!);
  }, [initialId, loadProject, project?.id]);

  return { project, setProject, loading, error, setError, loadProject, patchProject, refresh };
}
