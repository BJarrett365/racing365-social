import { describe, expect, it } from "vitest";
import { parseSixteenConclusionsHtml } from "@/app/lib/match-report/parse-sixteen-conclusions";

const SAMPLE_HTML = `
<h1>16 Conclusions from Leeds 1-0 Brighton: Calvert-Lewin, Darlow, Farke</h1>
<p>Leeds United secured a vital win at Elland Road.</p>
<h3>1. Calvert-Lewin's Late Heroics</h3>
<p><strong>Dominic Calvert-Lewin</strong> scored the decisive goal in the 90th minute, securing a vital win for Leeds United.</p>
<h3>2. Defensive Resilience</h3>
<p>Leeds' defence, anchored by <strong>Karl Darlow</strong>, was crucial in keeping a clean sheet against a dominant Brighton side.</p>
`;

describe("parseSixteenConclusionsHtml", () => {
  it("extracts numbered headings and body copy", () => {
    const parsed = parseSixteenConclusionsHtml(SAMPLE_HTML);
    expect(parsed.headline).toContain("16 Conclusions from Leeds 1-0 Brighton");
    expect(parsed.introParagraphs).toEqual(["Leeds United secured a vital win at Elland Road."]);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toMatchObject({
      number: 1,
      title: "Calvert-Lewin's Late Heroics",
    });
    expect(parsed.items[0]?.bodyHtml).toContain("<strong>Dominic Calvert-Lewin</strong>");
    expect(parsed.items[1]?.title).toBe("Defensive Resilience");
  });
});
