import { describe, expect, it } from "vitest";
import {
  canPublishWithGate,
  evaluateEditorialPublishGate,
  hasCriticalFactCheckFailure,
} from "@/app/lib/match-report/preview-publish-gate";
import type { EditorialScoreResult } from "@/app/lib/match-report/mio/types";
import type { MatchReportFactCheck, MatchReportProject } from "@/app/lib/match-report/types";

function score(overall: number): EditorialScoreResult {
  return {
    contentType: "match_preview",
    overall,
    dimensions: [],
    bannedPhraseHits: [],
    readabilityPenalty: 0,
    commercialBonus: 0,
    publishRecommended: overall >= 8,
    regenRecommended: overall < 8,
    heroCandidate: overall >= 9,
    tier: "T1",
    generatedAt: new Date().toISOString(),
  };
}

function project(overrides: Partial<MatchReportProject> = {}): MatchReportProject {
  return {
    id: "p1",
    sport: "football",
    contentType: "match_preview",
    reportScope: "full",
    reportFormat: "neutral",
    editorial: { targetBrand: "football365" } as MatchReportProject["editorial"],
    matchId: "m1",
    sportId: "1",
    competition: "Premier League",
    homeTeam: "Home",
    awayTeam: "Away",
    displayLabel: "Home v Away",
    status: "review",
    workflowStep: "review",
    workflowPhase: "review",
    layers: { manualSources: [], sixLogic: null } as MatchReportProject["layers"],
    health: { ok: true, issues: [] } as MatchReportProject["health"],
    confidence: 80,
    eventPicture: null,
    playerIntelligence: null,
    imageIntelligence: null,
    mediaOutputs: null,
    archive: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("evaluateEditorialPublishGate", () => {
  it("blocks below 7.0", () => {
    const gate = evaluateEditorialPublishGate(project(), score(6.8));
    expect(gate.status).toBe("blocked");
    expect(gate.canPublishWithoutOverride).toBe(false);
    expect(gate.requiresEditorOverride).toBe(true);
  });

  it("requires editor approval between 7.0 and 7.9", () => {
    const gate = evaluateEditorialPublishGate(project(), score(7.4));
    expect(gate.status).toBe("editor_approval_required");
    expect(gate.canPublishWithoutOverride).toBe(false);
  });

  it("allows publish at 8.0+", () => {
    const gate = evaluateEditorialPublishGate(project(), score(8.4));
    expect(gate.status).toBe("publish_eligible");
    expect(gate.canPublishWithoutOverride).toBe(true);
  });

  it("flags hero candidate at 9.0+", () => {
    const gate = evaluateEditorialPublishGate(project(), score(9.2));
    expect(gate.status).toBe("hero_candidate");
    expect(gate.heroCandidate).toBe(true);
  });

  it("blocks on critical fact check even with high score", () => {
    const factCheck = {
      status: "blocked",
      issues: [{ id: "1", severity: "high", sourceTier: "tier1", type: "tier1_contradiction", title: "x", detail: "y" }],
      articleScore: { overall: 90, status: "blocked", dimensions: {}, summary: "", topFixes: [] },
      storyContext: { derived: {} },
      checkedAt: "",
    } as MatchReportFactCheck;
    const gate = evaluateEditorialPublishGate(project({ factCheck }), score(8.8));
    expect(gate.criticalFactCheckFailure).toBe(true);
    expect(gate.canPublishWithoutOverride).toBe(false);
  });
});

describe("canPublishWithGate", () => {
  it("allows override for blocked score", () => {
    const gate = evaluateEditorialPublishGate(project(), score(6.8));
    const decision = canPublishWithGate(gate, {
      reason: "breaking_news",
      scoreAtOverride: 6.8,
      gateStatusAtOverride: "blocked",
      overriddenAt: new Date().toISOString(),
    });
    expect(decision.allowed).toBe(true);
  });

  it("requires detail for other reason", () => {
    const gate = evaluateEditorialPublishGate(project(), score(6.8));
    const decision = canPublishWithGate(gate, {
      reason: "other",
      scoreAtOverride: 6.8,
      gateStatusAtOverride: "blocked",
      overriddenAt: new Date().toISOString(),
    });
    expect(decision.allowed).toBe(false);
  });
});

describe("hasCriticalFactCheckFailure", () => {
  it("detects tier1 high issues", () => {
    const factCheck = {
      status: "warnings",
      issues: [{ severity: "high", sourceTier: "tier1" }],
    } as MatchReportFactCheck;
    expect(hasCriticalFactCheckFailure(factCheck)).toBe(true);
  });
});
