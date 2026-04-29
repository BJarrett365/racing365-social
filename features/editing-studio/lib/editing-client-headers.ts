/**
 * Optional identity headers for Editing Studio API calls (revision "changed by").
 * Set in the Revision history drawer or via localStorage:
 * - `editing-studio-user-name`
 * - `editing-studio-user-id`
 */
import type { EditingWorkflowRole } from "@/features/editing-studio/types/workflow";

export function getEditingStudioClientHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const name = window.localStorage.getItem("editing-studio-user-name")?.trim();
  const userId = window.localStorage.getItem("editing-studio-user-id")?.trim();
  const role = window.localStorage.getItem("editing-studio-role")?.trim() as EditingWorkflowRole | undefined;
  const out: Record<string, string> = {};
  if (name) out["x-editing-user-name"] = name;
  if (userId) out["x-editing-user-id"] = userId;
  if (role) out["x-editing-role"] = role;
  return out;
}
