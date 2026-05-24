import { describe, expect, it } from "vitest";
import type { InterviewIntelligence } from "@/app/lib/match-report/types";
import { interviewsForTranscriptPanelSide } from "@/app/lib/match-report/interviews-for-transcript-panel";

function row(partial: Partial<InterviewIntelligence> & { id: string }): InterviewIntelligence {
  return {
    sourceUrl: "https://youtu.be/x",
    quotes: [],
    themes: [],
    digest: "",
    importedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("interviewsForTranscriptPanelSide", () => {
  it("puts away-tagged rows only in away column", () => {
    const interviews = [
      row({ id: "1", team: "home" }),
      row({ id: "2", team: "away" }),
      row({ id: "3" }),
    ];
    const home = interviewsForTranscriptPanelSide(interviews, "home").map((i) => i.id).sort();
    const away = interviewsForTranscriptPanelSide(interviews, "away").map((i) => i.id).sort();
    expect(home).toEqual(["1", "3"]);
    expect(away).toEqual(["2"]);
  });

  it("lists neutral with home column", () => {
    const interviews = [row({ id: "n", team: "neutral" })];
    const home = interviewsForTranscriptPanelSide(interviews, "home");
    const away = interviewsForTranscriptPanelSide(interviews, "away");
    expect(home.map((i) => i.id)).toEqual(["n"]);
    expect(away).toHaveLength(0);
  });
});
