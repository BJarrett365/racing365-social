import { fetchSport365MatchPageHtml } from "@/app/lib/match-report/fetch-sport365-match-page";
import {
  assertSport365MatchUrl,
  extractSport365MatchPageId,
  parseSport365CommentaryFromHtml,
} from "@/app/lib/match-report/parse-sport365-commentary";
import { parseSport365FixtureContextFromHtml } from "@/app/lib/match-report/parse-sport365-fixture-context";
import type { FixtureContextIntelligence, Sport365Commentary } from "@/app/lib/match-report/types";

export type Sport365MatchIntelligence = {
  commentary: Sport365Commentary;
  fixtureContext: FixtureContextIntelligence | null;
};

export async function parseSport365MatchIntelligence(
  sourceUrl: string,
  homeTeam: string,
  awayTeam: string,
): Promise<Sport365MatchIntelligence> {
  const url = assertSport365MatchUrl(sourceUrl).toString();
  const matchPageId = extractSport365MatchPageId(url);
  const html = await fetchSport365MatchPageHtml(url);
  const commentary = parseSport365CommentaryFromHtml(html, url, matchPageId);
  const fixtureContext = parseSport365FixtureContextFromHtml(html, url, homeTeam, awayTeam);
  return { commentary, fixtureContext };
}
