import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import type { EditingWorkflowRole, WorkflowCommentEntry, WorkflowCommentKind } from "@/features/editing-studio/types/workflow";

export function appendWorkflowCommentEntry(
  existing: WorkflowCommentEntry[] | undefined,
  input: {
    body: string;
    kind: WorkflowCommentKind;
    role: EditingWorkflowRole;
    displayName?: string;
  },
): WorkflowCommentEntry[] {
  const entry: WorkflowCommentEntry = {
    id: newEditingStudioId("wc"),
    at: new Date().toISOString(),
    body: input.body.trim(),
    kind: input.kind,
    role: input.role,
    displayName: input.displayName?.trim(),
  };
  return [...(existing ?? []), entry];
}
