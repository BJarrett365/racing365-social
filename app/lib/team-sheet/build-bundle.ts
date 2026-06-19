import type { TeamSheetBundle, TeamSheetVariant } from "@/types";
import {
  buildTeamLineUpAiCaption,
  type Sport365LineupImport,
} from "@/app/lib/match-report/parse-sport365-lineups";

export function sport365ImportToTeamSheetBundle(
  id: string,
  imp: Sport365LineupImport,
  brandStyle: TeamSheetBundle["brandStyle"] = "sport365",
  opts: Partial<Pick<TeamSheetBundle, "sheetVariant" | "teamView">> = {},
): TeamSheetBundle {
  return {
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
    sheetVariant: opts.sheetVariant ?? "split",
    teamView: opts.teamView ?? (opts.sheetVariant === "combined" ? "both" : "home"),
    lineupStatus: imp.lineupStatus,
    exportAspect: "portrait",
    homeKitSlot: imp.homeKitSlot,
    awayKitSlot: imp.awayKitSlot,
    generateAiCaption: true,
    aiCaption: buildTeamLineUpAiCaption(imp.home, imp.away, imp.lineupStatus, "home"),
  };
}

export const TEAM_SHEET_VARIANTS: { id: TeamSheetVariant; label: string; hint: string }[] = [
  { id: "standard", label: "Team Sheet", hint: "Player image + XI list below" },
  { id: "split", label: "Split Team Sheet", hint: "Image left, XI right — Barcelona style" },
  { id: "hero", label: "Hero Line-Up", hint: "Full-bleed image + grouped XI" },
  { id: "combined", label: "Combined Team Sheets", hint: "Both teams on one card" },
];
