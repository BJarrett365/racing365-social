import { NextResponse } from "next/server";
import { getEditingWorkflowContext } from "@/features/editing-studio/lib/editing-workflow-context";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import {
  canPerformWorkflowAction,
  workflowActionDisabledReason,
} from "@/features/editing-studio/workflow/workflow-permissions";
import { workflowSubmitReviewBodySchema } from "@/features/editing-studio/validators/workflow-schemas";

const repo = getEditingStudioRepository();

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await repo.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { role, actor } = getEditingWorkflowContext(req);
    if (!canPerformWorkflowAction(role, project.status, "submit_review")) {
      return NextResponse.json(
        { error: "Forbidden", reason: workflowActionDisabledReason(role, project.status, "submit_review") },
        { status: 403 },
      );
    }
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const body = workflowSubmitReviewBodySchema.parse(raw);
    const next = await repo.workflowSubmitForReview(id, { role, actor, note: body.note });
    return NextResponse.json({ project: next });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
