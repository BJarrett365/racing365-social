import { EDITING_STUDIO_BASE_PATH } from "@/features/editing-studio/lib/constants";

export function editingStudioDashboardPath(): string {
  return EDITING_STUDIO_BASE_PATH;
}

export function editingStudioNewProjectPath(): string {
  return `${EDITING_STUDIO_BASE_PATH}/new`;
}

export function editingStudioProjectPath(projectId: string): string {
  return `${EDITING_STUDIO_BASE_PATH}/${encodeURIComponent(projectId)}`;
}

export function editingStudioProjectPreviewPath(projectId: string): string {
  return `${EDITING_STUDIO_BASE_PATH}/${encodeURIComponent(projectId)}/preview`;
}

export function editingStudioProjectHistoryPath(projectId: string): string {
  return `${EDITING_STUDIO_BASE_PATH}/${encodeURIComponent(projectId)}/history`;
}

export function editingStudioCalendarPath(): string {
  return `${EDITING_STUDIO_BASE_PATH}/calendar`;
}

/** Live Control — prefill new session from this project (`intent`: create | send_live). */
export function liveControlNewFromEditingProjectPath(
  projectId: string,
  intent: "create" | "send_live" = "create",
): string {
  const q = new URLSearchParams({
    fromEditingProjectId: projectId,
    intent,
  });
  return `/live/new?${q.toString()}`;
}
