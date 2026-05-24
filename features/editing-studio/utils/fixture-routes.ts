import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import type { EditingCalendarPhase } from "@/features/editing-studio/types/domain";
import { EDITING_STUDIO_BASE_PATH } from "@/features/editing-studio/lib/constants";

const MATCH_REPORT_BRAND_LABEL: Record<MatchReportTargetBrand, string> = {
  football365: "Football365",
  teamtalk: "TEAMtalk",
  "planet-football": "Planet Football",
  sport365: "Sport365",
};

export function editingStudioBrandForMatchReportBrand(brand: MatchReportTargetBrand): string {
  return MATCH_REPORT_BRAND_LABEL[brand];
}

export function editingStudioNewFromFixturePath(input: {
  slug: string;
  homeTeam: string;
  awayTeam: string;
  kickoffIso?: string;
  betwayMatchId?: string | null;
  brand: MatchReportTargetBrand;
  competition?: string;
}): string {
  const q = new URLSearchParams({
    fixtureSlug: input.slug,
    fixtureHome: input.homeTeam,
    fixtureAway: input.awayTeam,
    brand: editingStudioBrandForMatchReportBrand(input.brand),
  });
  if (input.kickoffIso) q.set("kickoff", input.kickoffIso);
  if (input.betwayMatchId) q.set("betwayId", String(input.betwayMatchId));
  if (input.competition) q.set("competition", input.competition);
  return `${EDITING_STUDIO_BASE_PATH}/new?${q.toString()}`;
}

export function editingStudioNewFromCalendarPath(input: {
  calendarEventId: string;
  calendarPhase: EditingCalendarPhase;
  brand?: string;
  fixtureHome?: string;
  fixtureAway?: string;
  kickoff?: string;
  competition?: string;
  fixtureSlug?: string;
  betwayId?: string;
}): string {
  const q = new URLSearchParams({
    calendarEventId: input.calendarEventId,
    calendarPhase: input.calendarPhase,
  });
  if (input.brand) q.set("brand", input.brand);
  if (input.fixtureHome) q.set("fixtureHome", input.fixtureHome);
  if (input.fixtureAway) q.set("fixtureAway", input.fixtureAway);
  if (input.kickoff) q.set("kickoff", input.kickoff);
  if (input.competition) q.set("competition", input.competition);
  if (input.fixtureSlug) q.set("fixtureSlug", input.fixtureSlug);
  if (input.betwayId) q.set("betwayId", input.betwayId);
  return `${EDITING_STUDIO_BASE_PATH}/new?${q.toString()}`;
}

export function matchReportFromCalendarPath(input: {
  calendarEventId: string;
  matchId?: string;
  sportId?: string;
  brand?: MatchReportTargetBrand;
}): string {
  const q = new URLSearchParams({ calendarEventId: input.calendarEventId, calendarPhase: "report_post" });
  if (input.matchId) q.set("matchId", input.matchId);
  if (input.sportId) q.set("sportId", input.sportId);
  if (input.brand) q.set("brand", input.brand);
  return `/match-report-builder/schedule?${q.toString()}`;
}

export function editingStudioCalendarPath(): string {
  return `${EDITING_STUDIO_BASE_PATH}/calendar`;
}
