import type { FootballLineupBundle } from "@/types";
import type { Sport365LineupImport } from "@/app/lib/match-report/parse-sport365-lineups";

export function sport365ImportToFootballLineupBundle(
  id: string,
  imp: Sport365LineupImport,
): FootballLineupBundle {
  return {
    id,
    league: imp.competition,
    competition: imp.competition,
    matchDate: imp.matchDate,
    kickoff: imp.kickoff,
    matchId: imp.matchId,
    sourceUrl: imp.sourceUrl,
    lineupStatus: imp.lineupStatus,
    home: imp.home,
    away: imp.away,
    bench: imp.bench,
    injuries: imp.injuries,
  };
}
