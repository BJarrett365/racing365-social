import type { EditorialPublishOverride } from "@/app/lib/match-report/mio/types";
import { canPublishWithGate, evaluateEditorialPublishGate } from "@/app/lib/match-report/preview-publish-gate";
import { getProjectEditorialScore } from "@/app/lib/match-report/run-editorial-review";
import type { MatchReportProject } from "@/app/lib/match-report/types";

export type PublishValidationResult =
  | { ok: true; gate: NonNullable<MatchReportProject["editorialPublishGate"]> }
  | { ok: false; error: string; gate?: MatchReportProject["editorialPublishGate"] };

export function validateMatchReportPublish(
  project: MatchReportProject,
  override?: EditorialPublishOverride | null,
): PublishValidationResult {
  if (!project.mediaOutputs) {
    return { ok: false, error: "Generate media outputs before publishing." };
  }
  if (!project.imageIntelligence?.hero?.url) {
    return { ok: false, error: "Hero image is required before publish." };
  }
  if (!project.factCheck) {
    return { ok: false, error: "Run the match report fact check before publishing." };
  }

  const editorialScore = getProjectEditorialScore(project);
  if (!editorialScore) {
    return { ok: false, error: "Run editorial review before publishing." };
  }

  const gate = project.editorialPublishGate ?? evaluateEditorialPublishGate(project, editorialScore);
  const decision = canPublishWithGate(gate, override ?? project.editorialPublishOverride);
  if (!decision.allowed) {
    return { ok: false, error: decision.error ?? "Publish blocked by editorial gate.", gate };
  }

  return { ok: true, gate };
}
