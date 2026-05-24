import type { MatchReportProject } from "@/app/lib/match-report/types";
import { stepLabel } from "@/app/lib/match-report/workflow";

export type WizardScreen =
  | "report_type"
  | "editorial"
  | "match_id"
  | "foundation"
  | "import"
  | "event_picture"
  | "generation"
  | "review";

export type WizardMilestoneId =
  | "report_type"
  | "editorial"
  | "match_id"
  | "foundation"
  | "import"
  | "event_picture"
  | "generate"
  | "review"
  | "publish";

export type WizardMilestone = {
  id: WizardMilestoneId;
  step: number;
  label: string;
  shortLabel: string;
};

export const WIZARD_MILESTONES: WizardMilestone[] = [
  { id: "report_type", step: 1, label: "Report type", shortLabel: "Type" },
  { id: "editorial", step: 2, label: "Editorial brief", shortLabel: "Brief" },
  { id: "match_id", step: 3, label: "Match ID", shortLabel: "Match ID" },
  { id: "foundation", step: 4, label: "Foundation", shortLabel: "Foundation" },
  { id: "import", step: 5, label: "Import data", shortLabel: "Import" },
  { id: "event_picture", step: 6, label: "Event picture", shortLabel: "Event" },
  { id: "generate", step: 7, label: "Generate", shortLabel: "Generate" },
  { id: "review", step: 8, label: "Review", shortLabel: "Review" },
  { id: "publish", step: 9, label: "Publish", shortLabel: "Publish" },
];

export type WizardProgress = {
  currentIndex: number;
  currentMilestone: WizardMilestone;
  sublabel?: string;
  published: boolean;
  completedCount: number;
};

const SCREEN_TO_MILESTONE: Record<WizardScreen, WizardMilestoneId> = {
  report_type: "report_type",
  editorial: "editorial",
  match_id: "match_id",
  foundation: "foundation",
  import: "import",
  event_picture: "event_picture",
  generation: "generate",
  review: "review",
};

function milestoneIndex(id: WizardMilestoneId): number {
  return WIZARD_MILESTONES.findIndex((row) => row.id === id);
}

export function resolveWizardProgress(
  screen: WizardScreen,
  project: MatchReportProject | null,
  eventPictureAcknowledged: boolean,
): WizardProgress {
  const published =
    project?.status === "published" || project?.workflowStep === "published" || Boolean(project?.archive?.publishedAt);

  if (published) {
    return {
      currentIndex: WIZARD_MILESTONES.length - 1,
      currentMilestone: WIZARD_MILESTONES[WIZARD_MILESTONES.length - 1]!,
      sublabel: "Published to Language Studio",
      published: true,
      completedCount: WIZARD_MILESTONES.length,
    };
  }

  let milestoneId = SCREEN_TO_MILESTONE[screen];
  if (screen === "review") milestoneId = "review";

  let sublabel: string | undefined;
  if (screen === "import" && project) {
    sublabel = stepLabel(project.workflowStep);
  } else if (screen === "generation" && project) {
    sublabel = stepLabel(project.workflowStep);
  } else if (screen === "event_picture") {
    sublabel = eventPictureAcknowledged ? undefined : "Review AI event summary";
  }

  const currentIndex = milestoneIndex(milestoneId);
  return {
    currentIndex,
    currentMilestone: WIZARD_MILESTONES[currentIndex] ?? WIZARD_MILESTONES[0]!,
    sublabel,
    published: false,
    completedCount: currentIndex,
  };
}
