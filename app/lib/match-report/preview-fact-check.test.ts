import { describe, expect, it } from "vitest";
import {
  previewFactCheckToMatchReportFactCheck,
  runPreviewFactCheck,
} from "@/app/lib/match-report/preview-fact-check";
import type { MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

function previewProject(overrides: Partial<MatchReportProject> = {}): MatchReportProject {
  return {
    id: "mr-preview-fc",
    sport: "football",
    contentType: "match_preview",
    reportScope: "full",
    reportFormat: "neutral",
    editorial: {
      sport: "football",
      contentStyle: "Match preview",
      targetBrand: "football365",
      brandStyle: "Football365",
      rewriteStyle: "sharp",
      useCreatorProfile: false,
      creatorStyleNotes: "",
      articleGuidelines: "",
      layerWeights: {
        sixLogic: 100,
        sport365Commentary: 80,
        leagueTable: 80,
        loopFeed: 70,
        optaPlayerData: 70,
        interviews: 60,
        manualSources: 60,
        playerIntelligence: 70,
      },
    },
    matchId: "12345",
    sportId: "1",
    competition: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Burnley",
    displayLabel: "Arsenal vs Burnley · Preview",
    status: "in_progress",
    workflowStep: "fact_check",
    workflowPhase: "generation",
    confidence: 90,
    layers: {
      sixLogic: {
        matchId: "12345",
        sportId: "1",
        facts: {
          homeTeam: "Arsenal",
          awayTeam: "Burnley",
          competition: "Premier League",
          kickoffIso: "2026-05-30 15:00",
          status: "Not Started",
        },
        lineups: { home: { starters: [], substitutes: [] }, away: { starters: [], substitutes: [] } },
        events: [],
        commentary: [],
        availableData: {},
      },
      sport365Commentary: null,
      fixtureContext: null,
      fotMobPreview: null,
      whoScoredPreview: null,
      leagueTable: null,
      leagueSeasonStats: null,
      loopFeed: null,
      optaPlayerData: null,
      interviews: [],
      manualSources: [],
    },
    health: { skippedLayers: [], sixLogicHealth: { status: "ok", missingCore: [] } },
    createdAt: "2026-05-28T00:00:00.000Z",
    updatedAt: "2026-05-28T00:00:00.000Z",
    ...overrides,
  };
}

const media = (overrides: Partial<MediaOutputs> = {}): MediaOutputs => ({
  headline: "Arsenal vs Burnley preview",
  standfirst: "Kick-off at 15:00 on 2026-05-30.",
  reportHtml: "<p>Arsenal host Burnley at the Emirates.</p>",
  playerRatingsHtml: "",
  sixteenConclusionsHtml: "",
  socialPosts: [],
  generatedAt: "2026-05-28T00:00:00.000Z",
  ...overrides,
});

describe("preview-fact-check", () => {
  it("flags invented final scores before kickoff", () => {
    const issues = runPreviewFactCheck(
      previewProject(),
      media({ reportHtml: "<p>Arsenal won 2-1 in a thriller last night.</p>" }),
    );
    expect(issues.some((row) => row.id === "preview-invented-score")).toBe(true);
  });

  it("flags unsourced injury claims", () => {
    const issues = runPreviewFactCheck(
      previewProject(),
      media({ reportHtml: "<p>Burnley striker is ruled out with injury.</p>" }),
    );
    expect(issues.some((row) => row.id === "preview-unsourced-injury")).toBe(true);
  });

  it("passes clean preview copy", () => {
    const issues = runPreviewFactCheck(previewProject(), media());
    expect(issues.filter((row) => row.severity === "high")).toHaveLength(0);
    const factCheck = previewFactCheckToMatchReportFactCheck(previewProject(), media(), issues);
    expect(factCheck.status).toBe("passed");
  });

  it("blocks publish on high-severity issues", () => {
    const issues = runPreviewFactCheck(
      previewProject(),
      media({ headline: "Burnley travel to London", reportHtml: "<p>Final score 2-0.</p>" }),
    );
    const factCheck = previewFactCheckToMatchReportFactCheck(previewProject(), media(), issues);
    expect(factCheck.status).toBe("blocked");
  });
});
