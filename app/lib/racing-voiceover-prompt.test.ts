import { describe, expect, it } from "vitest";
import { EDITOR_VOICEOVER_WRITER_PROMPT, LEAGUE_TABLE_EDITOR_VOICEOVER_PROMPT } from "@/app/lib/prompts-catalog";
import {
  buildRacingVoiceoverSystemPrompt,
  buildRacingVoiceoverUserPrompt,
  racingVoiceoverControlGuidance,
  racingVoiceoverSystemRole,
  racingVoiceoverTaskInstruction,
  racingVoiceoverTemperature,
} from "@/app/lib/racing-voiceover-prompt";

const USER_SCRIPT =
  "In Group D of the Group Stage, the USA leads with three points after their victory, boasting a goal difference of plus three. Australia, Turkey, and Paraguay are yet to score, with Paraguay sitting at the bottom after one match played. Stay tuned for more updates!";

const STANDINGS = `Group D · Group Stage (Group D) — standings on screen (Sport365)
1. USA — 3 pts (P1 W1 D0 L0 GD +3)
2. Australia — 0 pts (P0 W0 D0 L0 GD 0)
3. Turkey — 0 pts (P0 W0 D0 L0 GD 0)
4. Paraguay — 0 pts (P1 W0 D0 L1 GD -3)`;

const baseBody = {
  format: "planet-football-table",
  customPrompt: LEAGUE_TABLE_EDITOR_VOICEOVER_PROMPT,
  voiceStyle: "Punchy Tips" as const,
  deliveryStyle: "Smooth" as const,
  tone: "Confident" as const,
  optimiseForVoiceover: true,
  addEmphasis: true,
  journalistProfile: {
    name: "James Holland",
    brand: "TEAMtalk",
    sports: ["football"],
    styleNotes: "Direct, fan-facing football copy.",
  },
  fields: {
    intro: "Group D is heating up in the group stage!",
    "tip-1": "Group D · Group Stage table",
    outro: "For more coverage, head to Sport365.com",
    caption: "Group D standings update",
    voiceover_script: USER_SCRIPT,
    league_table_standings: STANDINGS,
  },
};

describe("racing-voiceover-prompt", () => {
  it("maps Punchy Tips + Smooth + Confident into dropdown interpretation", () => {
    const lines = racingVoiceoverControlGuidance({
      voiceStyle: "Punchy Tips",
      deliveryStyle: "Smooth",
      tone: "Confident",
      optimiseForVoiceover: true,
      addEmphasis: true,
    });
    expect(lines.join("\n")).toContain("Selection-led and sharp");
    expect(lines.join("\n")).toContain("Flowing spoken lines");
    expect(lines.join("\n")).toContain("Authoritative and decisive");
  });

  it("puts editorial controls before supporting guidelines and demands a rewrite", () => {
    const prompt = buildRacingVoiceoverUserPrompt(baseBody, {
      apiDefaultPrompt: EDITOR_VOICEOVER_WRITER_PROMPT,
    });

    const taskIdx = prompt.indexOf("TASK:");
    const controlsIdx = prompt.indexOf("=== EDITORIAL CONTROLS");
    const guidelinesIdx = prompt.indexOf("=== SUPPORTING GUIDELINES");
    const inputIdx = prompt.indexOf("=== INPUT FIELDS");

    expect(taskIdx).toBeGreaterThan(-1);
    expect(controlsIdx).toBeGreaterThan(taskIdx);
    expect(guidelinesIdx).toBeGreaterThan(controlsIdx);
    expect(inputIdx).toBeGreaterThan(guidelinesIdx);
    expect(prompt).toContain("NOT a light copy-edit");
    expect(prompt).toContain("voice_style: Punchy Tips");
    expect(prompt).toContain(USER_SCRIPT);
    expect(prompt).toContain("USA — 3 pts");
    expect(prompt).toContain("Style anchor (Punchy Tips)");
    expect(prompt).not.toContain("Portugal");
  });

  it("includes style in system prompt for league tables", () => {
    const system = buildRacingVoiceoverSystemPrompt("planet-football-table", baseBody);
    expect(system).toContain("ACTIVE EDITORIAL CONTROLS");
    expect(system).toContain("Punchy Tips");
    expect(system).toContain("Standings voice reference");
  });

  it("uses higher temperature for regenerate and versions", () => {
    expect(racingVoiceoverTemperature({ ...baseBody, mode: "improve" })).toBe(0.7);
    expect(racingVoiceoverTemperature({ ...baseBody, mode: "regenerate" })).toBe(0.8);
    expect(racingVoiceoverTemperature({ ...baseBody, mode: "versions" })).toBe(0.85);
  });

  it("uses standings-specific system role for league table formats", () => {
    expect(racingVoiceoverSystemRole("planet-football-table")).toContain("league_table_standings");
    expect(racingVoiceoverTaskInstruction({ ...baseBody, mode: "improve" })).toContain("Rephrase every sentence");
  });

  it("requires scorers in task when match result is in standings block", () => {
    const withMatch = {
      ...baseBody,
      fields: {
        ...baseBody.fields,
        league_table_standings: `=== MATCH RESULT ===
Final score: USA 4 – 1 Paraguay
Goal scorers (include in voiceover — name each scorer when timing allows):
- 31' Folarin Balogun (USA)
=== STANDINGS ON SCREEN ===
1. USA — 3 pts`,
      },
    };
    const prompt = buildRacingVoiceoverUserPrompt(withMatch, {
      apiDefaultPrompt: LEAGUE_TABLE_EDITOR_VOICEOVER_PROMPT,
    });
    expect(prompt).toContain("Name every listed goal scorer");
    expect(racingVoiceoverTaskInstruction({ ...withMatch, mode: "versions" })).toContain("all goal scorers");
  });
});
