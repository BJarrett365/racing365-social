import type { EventPictureLayerSummary } from "@/app/lib/match-report/types";

/** Match phase drives which MIO sections are active. */
export type MioMatchPhase = "preview" | "report";

export type MioSectionId =
  | "foundation"
  | "form"
  | "h2h"
  | "stakes"
  | "tactical_context"
  | "team_intelligence"
  | "team_news"
  | "lineups"
  | "odds"
  | "loop_feed"
  | "manual_sources"
  | "significance"
  | "creator_signals"
  | "next_match"
  | "post_match_events"
  | "player_ratings"
  | "interviews"
  | "governance";

export type SignificanceIntelligence = {
  whyCare: string;
  whyItMatters: string;
  whatHappensNext: string;
  tableImpact?: string;
  confidence: number;
  sourceLayers: string[];
  digest: string;
};

export type TeamIntelligenceConfidenceLabel = "confirmed" | "expected" | "predicted" | "possible_changes";

export type TeamIntelligencePlayerStatus = {
  name: string;
  team: "home" | "away";
  status: "injured" | "suspended" | "doubt" | "returning" | "available";
  detail: string;
  confidence: number;
  confidenceLabel: TeamIntelligenceConfidenceLabel;
  source: string;
  sourceTier: 1 | 2 | 3;
};

export type TeamIntelligenceXiSlot = {
  name: string;
  position?: string;
  confidence: number;
  confidenceLabel: TeamIntelligenceConfidenceLabel;
};

export type TeamIntelligence = {
  homeTeam: string;
  awayTeam: string;
  playerStatuses: TeamIntelligencePlayerStatus[];
  homePredictedXi: TeamIntelligenceXiSlot[];
  awayPredictedXi: TeamIntelligenceXiSlot[];
  digest: string;
  overallConfidence: number;
  sourceLayers: string[];
  generatedAt: string;
};

/** Pre-match editorial brief — distinct from post-match EventPicture. */
export type PreviewPicture = {
  headlineAngle: string;
  standfirstHooks: string[];
  storyThread: string;
  stateOfPlay: string;
  formContext: string;
  tacticalPreview: string;
  keyBattles: string[];
  teamNewsAngles: string[];
  predictedXiNotes: string;
  whatCouldDecide: string;
  aiPrediction?: string;
  verdict: string;
  whatHappensNext: string;
  significance?: SignificanceIntelligence;
  factualAnchors: string[];
  toneNotes: string;
  layerSummaries?: EventPictureLayerSummary[];
  generatedAt: string;
  model?: string;
};

export type EditorialScoreDimension = {
  id: string;
  label: string;
  weight: number;
  score: number;
  canBlockPublish: boolean;
  notes: string[];
};

export type EditorialScoreResult = {
  contentType: "match_preview" | "match_report";
  overall: number;
  dimensions: EditorialScoreDimension[];
  bannedPhraseHits: string[];
  readabilityPenalty: number;
  commercialBonus: number;
  publishRecommended: boolean;
  regenRecommended: boolean;
  heroCandidate: boolean;
  tier: "T1" | "T2" | "T3" | "T4";
  generatedAt: string;
};

export type DeepSeekEditorialReview = {
  overallScore: number;
  insightScore: number;
  tacticalDepthScore: number;
  originalityScore: number;
  repetitionIssues: string[];
  clicheHits: string[];
  missingContext: string[];
  improvementSuggestions: string[];
  regenRecommended: boolean;
  provider: string;
  model: string;
  generatedAt: string;
};

export type EditorialSectionLintResult = {
  ok: boolean;
  present: string[];
  missing: string[];
  notes: string[];
};

export type EditorialPublishGateStatus =
  | "blocked"
  | "editor_approval_required"
  | "publish_eligible"
  | "hero_candidate";

export type EditorOverrideReason =
  | "breaking_news"
  | "time_sensitive"
  | "editorial_decision"
  | "score_incorrect"
  | "other";

export type EditorialPublishOverride = {
  reason: EditorOverrideReason;
  detail?: string;
  scoreAtOverride: number;
  gateStatusAtOverride: EditorialPublishGateStatus;
  overriddenAt: string;
};

export type EditorialPublishGate = {
  status: EditorialPublishGateStatus;
  overallScore: number;
  canPublishWithoutOverride: boolean;
  requiresEditorOverride: boolean;
  criticalFactCheckFailure: boolean;
  heroCandidate: boolean;
  summary: string;
  evaluatedAt: string;
};

export type MatchIntelligenceObject = {
  phase: MioMatchPhase;
  projectId: string;
  promptBlock: string;
  significance?: SignificanceIntelligence;
  teamIntelligence?: TeamIntelligence;
  previewPicture?: PreviewPicture | null;
  assembledAt: string;
};
