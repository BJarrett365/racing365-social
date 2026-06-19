import { describe, expect, it } from "vitest";
import {
  buildSport365Ass,
  buildSport365SentenceCues,
  splitScriptIntoBroadcastSentences,
  wrapSport365SubtitleLines,
} from "@/app/lib/sport365-subtitle-burn";

describe("sport365-subtitle-burn", () => {
  it("splits script into short sentences", () => {
    const script =
      "USA dominate Group D with a decisive 4-1 win over Paraguay. Damian Bobadilla opened the scoring with an own goal at seven minutes.";
    const parts = splitScriptIntoBroadcastSentences(script);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("USA dominate");
  });

  it("builds timed cues across the video length", () => {
    const script = "First line. Second line. Third line.";
    const cues = buildSport365SentenceCues(script, 12);
    expect(cues).toHaveLength(3);
    expect(cues[0]!.startSec).toBe(0);
    expect(cues[2]!.endSec).toBeCloseTo(12, 0);
  });

  it("wraps long lines for ASS", () => {
    const lines = wrapSport365SubtitleLines(
      "Folarin Balogun doubled the lead at thirty-one and added another just before half-time.",
    );
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it("renders pink outline ASS style without background box", () => {
    const ass = buildSport365Ass([{ startSec: 0, endSec: 2.5, text: "USA lead Group D." }]);
    expect(ass).toContain("Sport365");
    expect(ass).toContain("USA LEAD GROUP D.");
    expect(ass).toMatch(/,1,\d+,0,2,/);
    expect(ass).toMatch(/&H00B533BD&/i);
    expect(ass).not.toMatch(/,4,\d+,0,2,/);
  });
});
