import { describe, expect, it } from "vitest";
import {
  buildPreviewEvents,
  extractPossessionFromCommentary,
  parseReportSections,
  stripReportHtmlForNarrative,
} from "@/app/lib/match-report/match-report-preview-data";
import type { MatchReportProject } from "@/app/lib/match-report/types";

describe("match-report-preview-data", () => {
  it("extracts final possession from commentary lines", () => {
    const possession = extractPossessionFromCommentary([
      { minute: 5, text: "[5'] Ball possession: Leeds United: 50%, Brighton & Hove Albion: 50%." },
      { minute: 90, text: "[90+11'] Ball possession: Leeds United: 34%, Brighton & Hove Albion: 66%." },
    ]);
    expect(possession).toEqual({ homePct: 34, awayPct: 66 });
  });

  it("strips ratings sections from report html", () => {
    const html =
      "<h1>Title</h1><p>Body one.</p><p>Body two.</p><h2>Match Summary</h2><p>Summary</p><h2>Player Ratings</h2><table></table>";
    expect(stripReportHtmlForNarrative(html)).toContain("Body one.");
    expect(stripReportHtmlForNarrative(html)).toContain("Match Summary");
    expect(stripReportHtmlForNarrative(html)).not.toContain("Player Ratings");
  });

  it("parses main paragraphs and extended text", () => {
    const sections = parseReportSections(
      "<p>First paragraph.</p><p>Second paragraph.</p><h2>Key Moments</h2><ul></ul>",
      {
        headlineAngle: "Angle",
        standfirstHooks: [],
        keyMoments: [],
        narrativeThreads: ["Thread one."],
        factualAnchors: ["Anchor one."],
        toneNotes: "",
        generatedAt: "2026-01-01T00:00:00.000Z",
        layerSummaries: [{ layer: "leagueTable", title: "Table", summary: "Brighton 8th." }],
      },
    );
    expect(sections.mainParagraphs).toEqual(["First paragraph.", "Second paragraph."]);
    expect(sections.extendedText).toContain("Thread one.");
    expect(sections.extendedText).not.toContain("Brighton 8th.");
  });

  it("parses explicit Match Analysis and Extended Report sections", () => {
    const sections = parseReportSections(
      "<h1>Title</h1><h2>Match Analysis</h2><p>Analysis one.</p><p>Analysis two.</p><h2>Extended Report</h2><p>Extended one.</p><p>Extended two.</p><h2>Player Ratings</h2><table></table>",
      null,
    );
    expect(sections.mainParagraphs).toEqual(["Analysis one.", "Analysis two."]);
    expect(sections.extendedText).toContain("Extended one.");
    expect(sections.extendedText).toContain("Extended two.");
    expect(sections.extendedText).not.toContain("Player Ratings");
  });

  it("builds preview events with injury-time minute labels", () => {
    const project = {
      homeTeam: "Leeds United",
      awayTeam: "Brighton and Hove Albion",
      layers: {
        sixLogic: {
          events: [
            {
              minute: 90,
              type: "Goal",
              text: "90' · Goal · Calvert-Lewin Dominic · (1-0)",
              teamSide: "home",
              playerName: "Calvert-Lewin Dominic",
            },
            {
              minute: 90,
              type: "Yellow",
              text: "90' · Yellow · Calvert-Lewin Dominic",
              teamSide: "home",
              playerName: "Calvert-Lewin Dominic",
            },
          ],
        },
        sport365Commentary: {
          lines: [
            {
              minute: 90,
              text: "[90+6'] G O O O O O A A L - Dominic Calvert-Lewin finds the net with the right foot!",
            },
            {
              minute: 90,
              text: "[90+7'] Dominic Calvert-Lewin from Leeds United is very pleased with the goal and can't stop celebrating. The referee sees no other way than to book him.",
            },
          ],
        },
      },
    } as unknown as MatchReportProject;

    const events = buildPreviewEvents(project);
    expect(events).toHaveLength(2);
    expect(events[0]?.minuteLabel).toBe("90+6'");
    expect(events[0]?.type).toBe("goal");
    expect(events[1]?.minuteLabel).toBe("90+7'");
    expect(events[1]?.type).toBe("yellow");
  });
});
