import type { EditingProjectStatus } from "@/features/editing-studio/types/domain";
import type { EditingWorkflowRole } from "@/features/editing-studio/types/workflow";

export type WorkflowAction =
  | "save_draft"
  | "submit_review"
  | "add_comment"
  | "approve"
  | "reject"
  | "schedule"
  | "publish"
  | "archive";

const ROLES: readonly EditingWorkflowRole[] = [
  "admin",
  "editor",
  "writer",
  "reviewer",
  "publisher",
];

export function normalizeWorkflowRole(raw: string | undefined | null): EditingWorkflowRole {
  const t = raw?.trim().toLowerCase();
  if (t && (ROLES as readonly string[]).includes(t)) return t as EditingWorkflowRole;
  return "writer";
}

/** Whether this role may perform the action for the given status (UI + server guard). */
export function canPerformWorkflowAction(
  role: EditingWorkflowRole,
  status: EditingProjectStatus,
  action: WorkflowAction,
): boolean {
  if (status === "archived") {
    return false;
  }

  const isAdmin = role === "admin";
  const isWriter = role === "writer" || role === "editor";
  const isReviewer = role === "reviewer" || role === "editor";
  const isPublisher = role === "publisher";

  switch (action) {
    case "save_draft":
      if (status === "published") return isAdmin;
      return isAdmin || isWriter || role === "reviewer" || isPublisher;
    case "submit_review":
      return (isAdmin || isWriter) && status === "draft";
    case "add_comment":
      if (status === "draft" || status === "published") return isAdmin;
      return isAdmin || isWriter || isReviewer || isPublisher;
    case "approve":
      return (isAdmin || isReviewer) && status === "in_review";
    case "reject":
      return (isAdmin || isReviewer) && status === "in_review";
    case "schedule":
      return (isAdmin || isPublisher) && status === "approved";
    case "publish":
      return (isAdmin || isPublisher) && (status === "scheduled" || status === "approved");
    case "archive":
      return isAdmin || isPublisher;
    default:
      return false;
  }
}

/** Human-readable reason when an action is disabled. */
export function workflowActionDisabledReason(
  role: EditingWorkflowRole,
  status: EditingProjectStatus,
  action: WorkflowAction,
): string | null {
  if (canPerformWorkflowAction(role, status, action)) return null;
  if (status === "archived") return "Project is archived.";
  switch (action) {
    case "submit_review":
      return status !== "draft" ? "Only drafts can be submitted for review." : "Your role cannot submit for review.";
    case "approve":
    case "reject":
      return status !== "in_review" ? "Approve and reject are only available while in review." : "Your role cannot approve or reject.";
    case "schedule":
      return status !== "approved" ? "Schedule is available when the project is approved." : "Your role cannot schedule.";
    case "publish":
      return !["scheduled", "approved"].includes(status)
        ? "Publish when approved or after scheduling."
        : "Your role cannot publish.";
    case "archive":
      return "Your role cannot archive.";
    case "save_draft":
      return status === "published"
        ? "Only admins can save changes while published."
        : "Your role cannot save in this state.";
    case "add_comment":
      return "Your role cannot add a comment in this state.";
    default:
      return "Not available.";
  }
}
