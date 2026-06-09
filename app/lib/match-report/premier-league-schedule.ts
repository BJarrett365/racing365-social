import type { ScheduleBrandDualStatus } from "@/app/lib/match-report/schedule-brand-status";
import type { MatchReportTargetBrand, SavedReportIndexEntry } from "@/app/lib/match-report/types";
import { enrichBetwayListingFixture } from "@/app/lib/match-report/betway-listing-parse";
import type { BetwayListingParsedFixture, BetwayListingRawFixture } from "@/app/lib/match-report/betway-listing-types";
import { SCHEDULE_EDITORIAL_BRANDS } from "@/app/lib/match-report/schedule-editorial-brands";
import {
  brandReportStatusFromIndex,
  type Wc2026BrandReportStatus,
  type Wc2026ReportStatus,
} from "@/app/lib/match-report/wc2026-schedule";

export const EPL_BETWAY_UPCOMINGS_URL =
  "https://www.betwayscores.com/football/league/premier-league-72602/72602/upcomings";

export const EPL_COMPETITION = "Premier League";

export const EPL_EDITORIAL_BRANDS: MatchReportTargetBrand[] = [...SCHEDULE_EDITORIAL_BRANDS];

export type EplFixtureSeed = {
  slug: string;
  date: string;
  kickoffIso: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  targetBrands: MatchReportTargetBrand[];
  betwayMatchId?: string | null;
  sixLogicSportId: string;
  sixLogicMatchId?: string | null;
};

export type EplScheduleRow = EplFixtureSeed & {
  brandReports: Wc2026BrandReportStatus[];
  brandDualStatuses: ScheduleBrandDualStatus[];
};

export function enrichBetwayEplFixture(raw: BetwayListingRawFixture): BetwayListingParsedFixture {
  return enrichBetwayListingFixture(raw, { group: "EPL", stage: "League" });
}

export function betwayEplFixturesToSeeds(fixtures: BetwayListingParsedFixture[]): EplFixtureSeed[] {
  return fixtures.map((fixture) => ({
    slug: `epl-bw-${fixture.betwayMatchId}`,
    date: fixture.date ?? new Date().toISOString().slice(0, 10),
    kickoffIso: fixture.kickoffIso ?? `${fixture.date ?? "2026-01-01"} 15:00`,
    group: fixture.group ?? "EPL",
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    competition: EPL_COMPETITION,
    targetBrands: [...EPL_EDITORIAL_BRANDS],
    betwayMatchId: fixture.betwayMatchId,
    sixLogicSportId: "1",
    sixLogicMatchId: fixture.betwayMatchId,
  }));
}

export function buildBrandReportsForEplFixture(
  fixture: Pick<EplFixtureSeed, "homeTeam" | "awayTeam" | "targetBrands">,
  indexEntries: SavedReportIndexEntry[],
): Wc2026BrandReportStatus[] {
  return fixture.targetBrands.map((brand) =>
    brandReportStatusFromIndex(brand, indexEntries, fixture.homeTeam, fixture.awayTeam),
  );
}

export function aggregateEplReportStatus(reports: Wc2026BrandReportStatus[]): Wc2026ReportStatus {
  if (reports.some((row) => row.status === "complete")) return "complete";
  if (reports.some((row) => row.status === "in_progress")) return "in_progress";
  return "not_started";
}
