/**
 * Editorial workflow roles (client header / localStorage; server validates the same).
 * - admin: all actions
 * - editor: writer + reviewer (submit, approve, reject, comment)
 * - writer: drafts and submit for review
 * - reviewer: approve / reject / comment in review
 * - publisher: schedule, publish, archive
 */
export type EditingWorkflowRole = "admin" | "editor" | "writer" | "reviewer" | "publisher";

export type WorkflowCommentKind =
  | "comment"
  | "submit_review"
  | "approve"
  | "reject"
  | "schedule"
  | "publish"
  | "archive";

export type WorkflowCommentEntry = {
  id: string;
  at: string;
  body: string;
  kind: WorkflowCommentKind;
  role?: EditingWorkflowRole;
  /** Display label (e.g. from x-editing-user-name) */
  displayName?: string;
};
