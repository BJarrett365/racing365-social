import { buildMatchStoryContext } from "@/app/lib/match-report/story-engine";
import type { MatchReportFactCheck, MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

export type PreviewFactCheckIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
};

const SCORE_IN_HTML =
  /\b(?:won|beat|defeated|finished|ended)\s+\d{1,2}[-–]\d{1,2}\b|\bfinal score\b|\b\d{1,2}[-–]\d{1,2}\s+(?:win|victory|defeat)\b/i;

const LINEUP_CLAIM =
  /\b(?:starting\s+xi|line-?up|starts?:|named\s+the\s+same\s+xi)\b/i;

const PREDICTED_QUALIFIER = /\b(?:predicted|expected|likely|provisional|predicted\s+xi)\b/i;

const INJURY_CLAIM =
  /\b(?:injur(?:y|ed)|suspended|doubtful|ruled\s+out|miss(?:es|ing)|fitness\s+concern)\b/i;

const ODDS_MENTION = /\b(?:odds|favourite|favorite|@\s*\d+\/\d+|price\s+of)\b/i;

const GAMBLE_DISCLAIMER = /\b(?:gamble\s+responsibly|please\s+gamble)\b/i;

function htmlText(media: MediaOutputs): string {
  return [media.headline, media.standfirst, media.reportHtml].filter(Boolean).join("\n");
}

function matchNotPlayed(project: MatchReportProject): boolean {
  const status = project.layers.sixLogic?.facts.status?.toLowerCase() ?? "";
  if (status.includes("finish")) return false;
  if (project.homeScore !== undefined && project.awayScore !== undefined) return false;
  return true;
}

export function runPreviewFactCheck(project: MatchReportProject, media: MediaOutputs): PreviewFactCheckIssue[] {
  const issues: PreviewFactCheckIssue[] = [];
  const text = htmlText(media);
  const lower = text.toLowerCase();

  if (matchNotPlayed(project) && SCORE_IN_HTML.test(text)) {
    issues.push({
      id: "preview-invented-score",
      severity: "high",
      message: "Preview mentions a final score or result but the match has not been played.",
    });
  }

  if (LINEUP_CLAIM.test(text) && !PREDICTED_QUALIFIER.test(text)) {
    const hasConfirmedLineups =
      (project.layers.sixLogic?.lineups.home.starters.length ?? 0) > 0 ||
      (project.layers.sixLogic?.lineups.away.starters.length ?? 0) > 0;
    if (!hasConfirmedLineups) {
      issues.push({
        id: "preview-unconfirmed-lineup",
        severity: "medium",
        message: "Starting XI language without predicted/expected qualifier and no confirmed line-ups in feed.",
      });
    }
  }

  if (INJURY_CLAIM.test(text)) {
    const teamNews = project.layers.manualSources
      .concat(
        project.layers.manualSources.filter((row) => row.derivedFrom === "loop_feed"),
      )
      .map((row) => row.excerpt.toLowerCase());
    const loopDigest = project.layers.loopFeed?.digest?.toLowerCase() ?? "";
    const hasSource = teamNews.some((excerpt) =>
      INJURY_CLAIM.test(excerpt),
    ) || INJURY_CLAIM.test(loopDigest);
    if (!hasSource) {
      issues.push({
        id: "preview-unsourced-injury",
        severity: "high",
        message: "Injury or suspension claim not traceable to manual sources or Loop Feed digest.",
      });
    }
  }

  if (ODDS_MENTION.test(text) && !GAMBLE_DISCLAIMER.test(lower)) {
    issues.push({
      id: "preview-odds-without-disclaimer",
      severity: "medium",
      message: "Odds mentioned without a responsible gambling disclaimer.",
    });
  }

  const kickoff = project.layers.sixLogic?.facts.kickoffIso;
  if (kickoff && !lower.includes(kickoff.slice(0, 10)) && !/\bkick-?off\b/i.test(text)) {
    issues.push({
      id: "preview-missing-kickoff-context",
      severity: "low",
      message: "Kickoff date/time from foundation not reflected in preview copy.",
    });
  }

  const home = project.homeTeam.toLowerCase();
  const away = project.awayTeam.toLowerCase();
  if (media.headline && (!lower.includes(home) || !lower.includes(away))) {
    issues.push({
      id: "preview-team-name-mismatch",
      severity: "high",
      message: "Headline does not include both home and away team names from foundation.",
    });
  }

  return issues;
}

export function previewFactCheckToMatchReportFactCheck(
  project: MatchReportProject,
  media: MediaOutputs,
  issues: PreviewFactCheckIssue[],
): MatchReportFactCheck {
  const high = issues.filter((row) => row.severity === "high").length;
  const blocked = high > 0;
  const factualAccuracy = Math.max(0, 100 - high * 25 - issues.filter((i) => i.severity === "medium").length * 8);
  const overall = factualAccuracy;
  return {
    status: blocked ? "blocked" : issues.length > 0 ? "warnings" : "passed",
    issues: issues.map((row, index) => ({
      id: row.id || `preview-fc-${index + 1}`,
      severity: row.severity,
      sourceTier: row.severity === "high" ? "tier1" : "tier2",
      type: "tier1_contradiction",
      title: row.id,
      detail: row.message,
    })),
    articleScore: {
      overall,
      status: blocked ? "blocked" : overall >= 75 ? "publish_ready" : "needs_edit",
      dimensions: {
        factualAccuracy,
        researchDepth: project.confidence,
        insightQuality: 70,
        journalistVoice: 75,
        brandFit: 80,
        opinionHumour: 65,
        structureReadability: 75,
      },
      summary: blocked
        ? "Preview blocked — high-severity fabrication checks failed."
        : issues.length > 0
          ? "Preview passed with warnings — review team news and odds disclaimers."
          : "Preview passed fact-check.",
      topFixes: issues.slice(0, 3).map((row) => row.message),
    },
    storyContext: buildMatchStoryContext(project),
    checkedAt: new Date().toISOString(),
  };
}
