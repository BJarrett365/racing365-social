import type { TeamLineUpBundle } from "@/types";
import {
  buildTeamLineUpAiCaption,
  type Sport365LineupImport,
} from "@/app/lib/match-report/parse-sport365-lineups";

export function sport365ImportToTeamLineUpBundle(
  id: string,
  imp: Sport365LineupImport,
  brandStyle: TeamLineUpBundle["brandStyle"] = "sport365",
): TeamLineUpBundle {
  const bundle: TeamLineUpBundle = {
    id,
    league: imp.competition,
    matchDate: imp.matchDate,
    kickoff: imp.kickoff,
    home: imp.home,
    away: imp.away,
    bench: imp.bench,
    injuries: imp.injuries,
    matchId: imp.matchId,
    sourceUrl: imp.sourceUrl,
    competition: imp.competition,
    brandStyle,
    teamView: "both",
    lineupStatus: imp.lineupStatus,
    exportAspect: "portrait",
    homeKitSlot: imp.homeKitSlot,
    awayKitSlot: imp.awayKitSlot,
    generateAiCaption: true,
    aiCaption: buildTeamLineUpAiCaption(imp.home, imp.away, imp.lineupStatus, "home"),
    introLine: "Line-ups",
    outroLine: "For more coverage, head to SPORT365",
  };
  return bundle;
}
