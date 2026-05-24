import { describe, expect, it } from "vitest";
import { parseSport365CommentaryFromHtml } from "@/app/lib/match-report/parse-sport365-commentary";

const SAMPLE_NEXT_DATA = {
  props: {
    pageProps: {
      match: {
        comms: [
          { txt: "Leeds United take the lead through Dominic Calvert-Lewin.", min: 90, inj_time: 7 },
          { txt: "Brighton & Hove Albion kick-off, and the game is underway.", min: 1 },
          { txt: "Welcome to Elland Road, the match will start in about 5 minutes." },
        ],
      },
    },
  },
};

describe("parse-sport365-commentary", () => {
  it("extracts readable commentary from match.comms in __NEXT_DATA__", () => {
    const html = `<html><head><title>Leeds v Brighton live scores and updates | Sport365</title></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(SAMPLE_NEXT_DATA)}</script></body></html>`;
    const result = parseSport365CommentaryFromHtml(html, "https://www.sport365.com/football/england/premier-league/leeds-vs-brighton/1-4157164", "1-4157164");

    expect(result.lines.length).toBe(3);
    expect(result.lines.some((line) => line.text.includes("Calvert-Lewin"))).toBe(true);
    expect(result.lines.some((line) => line.text.includes("kick-off"))).toBe(true);
    expect(result.digest).not.toContain('"name":"Leeds"');
    expect(result.homeTeam).toBe("Leeds");
    expect(result.awayTeam).toBe("Brighton");
  });
});
