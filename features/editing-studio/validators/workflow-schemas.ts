import { z } from "zod";

export const editingWorkflowRoleSchema = z.enum(["admin", "editor", "writer", "reviewer", "publisher"]);

export const workflowCommentKindSchema = z.enum([
  "comment",
  "submit_review",
  "approve",
  "reject",
  "schedule",
  "publish",
  "archive",
]);

export const workflowCommentEntrySchema = z.object({
  id: z.string().min(1),
  at: z.string().min(1),
  body: z.string(),
  kind: workflowCommentKindSchema,
  role: editingWorkflowRoleSchema.optional(),
  displayName: z.string().optional(),
});

export const workflowSubmitReviewBodySchema = z.object({
  note: z.string().max(8000).optional(),
});

export const workflowApproveBodySchema = z.object({
  note: z.string().max(8000).optional(),
});

export const workflowRejectBodySchema = z.object({
  note: z.string().min(1, "A note is required when rejecting.").max(8000),
});

export const workflowScheduleBodySchema = z.object({
  scheduledAt: z.string().min(1, "scheduledAt is required"),
  note: z.string().max(8000).optional(),
});

export const workflowPublishBodySchema = z.object({
  note: z.string().max(8000).optional(),
});

export const workflowArchiveBodySchema = z.object({
  note: z.string().max(8000).optional(),
});

export const workflowCommentBodySchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(8000),
});
