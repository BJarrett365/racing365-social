import type {
  EditorialPublishGate,
  EditorialPublishGateStatus,
  EditorialPublishOverride,
  EditorialScoreResult,
  EditorOverrideReason,
} from "@/app/lib/match-report/mio/types";
import type { MatchReportFactCheck, MatchReportProject } from "@/app/lib/match-report/types";

export const EDITOR_OVERRIDE_REASONS: { id: EditorOverrideReason; label: string }[] = [
  { id: "breaking_news", label: "Breaking News" },
  { id: "time_sensitive", label: "Time Sensitive" },
  { id: "editorial_decision", label: "Editorial Decision" },
  { id: "score_incorrect", label: "Score Incorrect" },
  { id: "other", label: "Other" },
];

export function hasCriticalFactCheckFailure(factCheck?: MatchReportFactCheck | null): boolean {
  if (!factCheck) return false;
  if (factCheck.status === "blocked") return true;
  return factCheck.issues.some((issue) => issue.sourceTier === "tier1" && issue.severity === "high");
}

function scoreBand(overall: number): EditorialPublishGateStatus {
  if (overall >= 9) return "hero_candidate";
  if (overall >= 8) return "publish_eligible";
  if (overall >= 7) return "editor_approval_required";
  return "blocked";
}

function gateSummary(
  status: EditorialPublishGateStatus,
  overall: number,
  criticalFactCheckFailure: boolean,
): string {
  if (criticalFactCheckFailure) {
    return "Critical fact-check failure — publish blocked until resolved or editor override.";
  }
  switch (status) {
    case "hero_candidate":
      return `Hero candidate (${overall.toFixed(1)}) — publish eligible; flag for homepage consideration.`;
    case "publish_eligible":
      return `Publish eligible (${overall.toFixed(1)}) — meets Football365 editorial threshold.`;
    case "editor_approval_required":
      return `Editor approval required (${overall.toFixed(1)}) — score between 7.0 and 7.9.`;
    default:
      return `Blocked (${overall.toFixed(1)}) — score below 7.0.`;
  }
}

export function evaluateEditorialPublishGate(
  project: MatchReportProject,
  editorialScore: EditorialScoreResult | null | undefined,
): EditorialPublishGate {
  const overall = editorialScore?.overall ?? 0;
  const criticalFactCheckFailure = hasCriticalFactCheckFailure(project.factCheck);
  const scoreStatus = editorialScore ? scoreBand(overall) : "blocked";
  const status: EditorialPublishGateStatus =
    scoreStatus === "hero_candidate" ? "hero_candidate" : scoreStatus;

  const canPublishWithoutOverride =
    Boolean(editorialScore) &&
    !criticalFactCheckFailure &&
    (status === "publish_eligible" || status === "hero_candidate");

  const requiresEditorOverride =
    Boolean(editorialScore) &&
    (criticalFactCheckFailure || status === "blocked" || status === "editor_approval_required");

  return {
    status,
    overallScore: overall,
    canPublishWithoutOverride,
    requiresEditorOverride,
    criticalFactCheckFailure,
    heroCandidate: status === "hero_candidate",
    summary: editorialScore
      ? gateSummary(status, overall, criticalFactCheckFailure)
      : "Run editorial review before publishing.",
    evaluatedAt: new Date().toISOString(),
  };
}

export function canPublishWithGate(
  gate: EditorialPublishGate,
  override?: EditorialPublishOverride | null,
): { allowed: boolean; error?: string } {
  if (gate.canPublishWithoutOverride) return { allowed: true };
  if (!gate.requiresEditorOverride) {
    return { allowed: false, error: "Editorial review required before publish." };
  }
  if (!override?.reason) {
    return {
      allowed: false,
      error: gate.criticalFactCheckFailure
        ? "Critical fact-check failure — resolve issues or provide an editor override reason."
        : `Editorial score ${gate.overallScore.toFixed(1)} requires editor override before publish.`,
    };
  }
  if (override.reason === "other" && !override.detail?.trim()) {
    return { allowed: false, error: "Provide details when override reason is Other." };
  }
  return { allowed: true };
}
