import { describe, expect, it } from "vitest";
import { fetchFotMobMatchPage } from "@/app/lib/match-report/fetch-fotmob-match-page";
import {
  fotMobPreviewToFixtureContext,
  parseFotMobPreviewFromPageProps,
  parseFotMobPreviewMatch,
  resolveFotMobMatchUrl,
} from "@/app/lib/match-report/parse-fotmob-preview";

describe("resolveFotMobMatchUrl", () => {
  it("normalises match URLs to en-GB pages", () => {
    expect(resolveFotMobMatchUrl("https://www.fotmob.com/matches/south-africa-vs-mexico/1einvt")).toBe(
      "https://www.fotmob.com/en-GB/matches/south-africa-vs-mexico/1einvt",
    );
  });
});

describe("parseFotMobPreviewFromPageProps", () => {
  it("parses form, H2H, lineups, and win-probability insights", () => {
    const preview = parseFotMobPreviewFromPageProps(
      {
        general: {
          matchId: "4667751",
          leagueName: "World Cup Grp. A",
          matchTimeUTC: "Thu, Jun 11, 2026, 19:00 UTC",
          homeTeam: { name: "Mexico", id: 6710 },
          awayTeam: { name: "South Africa", id: 6316 },
        },
        header: {
          teams: [
            { name: "Mexico", fifaRank: 15 },
            { name: "South Africa", fifaRank: 60 },
          ],
        },
        content: {
          h2h: {
            summary: [0, 1, 0],
            matches: [
              {
                home: { name: "South Africa" },
                away: { name: "Mexico" },
                status: { scoreStr: "1 - 1" },
                time: { utcTime: "2010-06-11T14:05:00.000Z" },
                league: { name: "World Cup grp. A" },
              },
            ],
          },
          matchFacts: {
            teamForm: [
              [
                {
                  score: "2 - 0",
                  tooltipText: {
                    homeTeam: "Mexico",
                    awayTeam: "Ecuador",
                    homeScore: "2",
                    awayScore: "0",
                    utcTime: "2026-05-20T00:00:00.000Z",
                  },
                },
              ],
              [
                {
                  score: "1 - 2",
                  tooltipText: {
                    homeTeam: "South Africa",
                    awayTeam: "Cameroon",
                    homeScore: "1",
                    awayScore: "2",
                    utcTime: "2026-05-18T00:00:00.000Z",
                  },
                },
              ],
            ],
            poll: {
              oddspoll: {
                Facts: [{ defaultText: "Mexico haven't lost in 8 matches." }],
              },
            },
            insights: [{ type: "team", text: "Haven't lost in 8 matches" }],
            infoBox: {
              Stadium: { name: "Mexico City Stadium", city: "Ciudad de México", capacity: 83000 },
            },
          },
          lineup: {
            lineupType: "lastStarting11",
            homeTeam: {
              name: "Mexico",
              formation: "4-1-4-1",
              starters: [{ name: "Raúl Rangel", shirtNumber: "1" }],
              subs: [{ name: "Luis Chávez", shirtNumber: "8" }],
            },
            awayTeam: {
              name: "South Africa",
              formation: "4-2-3-1",
              starters: [{ name: "Ronwen Williams", shirtNumber: "1" }],
              subs: [{ name: "Sipho Chaine", shirtNumber: "16" }],
            },
          },
          stats: null,
          playerStats: null,
        },
      },
      "https://www.fotmob.com/en-GB/matches/south-africa-vs-mexico/1einvt",
      "Mexico",
      "South Africa",
    );

    expect(preview.headToHead).toHaveLength(1);
    expect(preview.homeRecentResults).toHaveLength(1);
    expect(preview.awayRecentResults).toHaveLength(1);
    expect(preview.homeLineup?.formation).toBe("4-1-4-1");
    expect(preview.awayLineup?.formation).toBe("4-2-3-1");
    expect(preview.awayLineup?.bench).toHaveLength(1);
    expect(preview.winProbability.pollInsights[0]).toContain("haven't lost");
    expect(preview.statsComparison.rows[0]).toMatchObject({ label: "FIFA ranking", home: 15, away: 60 });

    const fixtureContext = fotMobPreviewToFixtureContext(preview);
    expect(fixtureContext.matchFacts?.length).toBeGreaterThan(0);
    expect(fixtureContext.digest).toContain("Mexico");
  });
});

describe("FotMob live preview fixture", () => {
  it("imports Mexico vs South Africa from FotMob", async () => {
    const preview = await parseFotMobPreviewMatch(
      "https://www.fotmob.com/en-GB/matches/south-africa-vs-mexico/1einvt",
      "Mexico",
      "South Africa",
    );
    expect(preview.homeLineup?.starters.length).toBeGreaterThan(0);
    expect(preview.awayLineup?.formation).toBeTruthy();
    expect(preview.homeRecentResults.length + preview.awayRecentResults.length).toBeGreaterThan(0);
  }, 60_000);

  it("fetches __NEXT_DATA__ without a browser", async () => {
    const { pageProps } = await fetchFotMobMatchPage(
      "https://www.fotmob.com/en-GB/matches/south-africa-vs-mexico/1einvt",
    );
    expect(pageProps.content).toBeTruthy();
  }, 30_000);
});
