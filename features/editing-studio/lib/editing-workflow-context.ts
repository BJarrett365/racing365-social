import { getEditingRevisionActorFromRequest } from "@/features/editing-studio/lib/editing-revision-actor";
import type { EditingRevisionActor } from "@/features/editing-studio/types/domain";
import type { EditingWorkflowRole } from "@/features/editing-studio/types/workflow";
import { normalizeWorkflowRole } from "@/features/editing-studio/workflow/workflow-permissions";

export type EditingWorkflowRequestContext = {
  role: EditingWorkflowRole;
  actor: EditingRevisionActor;
};

export function getEditingWorkflowContext(req: Request): EditingWorkflowRequestContext {
  const actor = getEditingRevisionActorFromRequest(req);
  const role = normalizeWorkflowRole(req.headers.get("x-editing-role"));
  return { role, actor };
}
