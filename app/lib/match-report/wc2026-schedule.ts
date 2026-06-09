import type { ScheduleBrandDualStatus } from "@/app/lib/match-report/schedule-brand-status";
import type { MatchReportTargetBrand, SavedReportIndexEntry } from "@/app/lib/match-report/types";
import { BETWAY_WC2026_GROUPS } from "@/app/lib/match-report/betway-wc2026-constants";
import { SCHEDULE_EDITORIAL_BRANDS } from "@/app/lib/match-report/schedule-editorial-brands";

/** Editorial brands that share the World Cup 2026 fixture schedule. */
export const WC2026_EDITORIAL_BRANDS: MatchReportTargetBrand[] = [...SCHEDULE_EDITORIAL_BRANDS];

export const WC2026_COMPETITION = "FIFA World Cup 2026";

/** Official WC 2026 group draw (Betway Scores / FIFA). */
export const WC2026_GROUPS: Record<string, [string, string, string, string]> = Object.fromEntries(
  Object.entries(BETWAY_WC2026_GROUPS).map(([group, teams]) => [group, teams as [string, string, string, string]]),
) as Record<string, [string, string, string, string]>;

export type Wc2026FixtureSeed = {
  slug: string;
  date: string;
  kickoffIso: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  targetBrands: MatchReportTargetBrand[];
  betwayMatchId?: string | null;
  sixLogicSportId: string;
  sixLogicMatchId?: string | null;
};

function groupRoundRobinPairs(teams: [string, string, string, string]): Array<[string, string]> {
  const [t0, t1, t2, t3] = teams;
  return [
    [t0, t1],
    [t2, t3],
    [t0, t2],
    [t1, t3],
    [t0, t3],
    [t1, t2],
  ];
}

function slugify(team: string): string {
  return team
    .toLowerCase()
    .replace(/\bfc\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildWc2026GroupFixtures(startDate = "2026-06-11"): Wc2026FixtureSeed[] {
  const fixtures: Wc2026FixtureSeed[] = [];
  let dayOffset = 0;

  for (const group of Object.keys(WC2026_GROUPS).sort()) {
    const teams = WC2026_GROUPS[group]!;
    for (const [homeTeam, awayTeam] of groupRoundRobinPairs(teams)) {
      const date = addDays(startDate, dayOffset);
      fixtures.push({
        slug: `wc2026-${group.toLowerCase()}-${slugify(homeTeam)}-${slugify(awayTeam)}-${date}`,
        date,
        kickoffIso: `${date} 19:00`,
        group,
        homeTeam,
        awayTeam,
        competition: WC2026_COMPETITION,
        targetBrands: [...WC2026_EDITORIAL_BRANDS],
        betwayMatchId: null,
        sixLogicSportId: "1",
        sixLogicMatchId: null,
      });
      dayOffset += 1;
    }
  }

  return fixtures;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function mergeWc2026BetwayIds(
  seeds: Wc2026FixtureSeed[],
  betwayBySlug: Record<string, string | null | undefined>,
): Wc2026FixtureSeed[] {
  return seeds.map((row) => ({
    ...row,
    betwayMatchId: betwayBySlug[row.slug] ?? row.betwayMatchId ?? null,
  }));
}

const TEAM_ALIASES: Record<string, string> = {
  usa: "unitedstates",
  us: "unitedstates",
  "united states": "unitedstates",
  "united states of america": "unitedstates",
  "korea republic": "korearepublic",
  "south korea": "korearepublic",
  korea: "korearepublic",
  "republic of korea": "korearepublic",
  "new zealand": "newzealand",
  "costa rica": "costarica",
  "saudi arabia": "saudiarabia",
  "bosnia herzegovina": "bosniaherzegovina",
  "bosnia and herzegovina": "bosniaherzegovina",
  "bosnia-herzegovina": "bosniaherzegovina",
  "ivory coast": "ivorycoast",
  "cote divoire": "ivorycoast",
  "dr congo": "drcongo",
  "democratic republic of congo": "drcongo",
  "democratic republic of the congo": "drcongo",
  "cape verde": "capeverde",
  curacao: "curacao",
  curaao: "curacao",
};

/** Normalise team names for fuzzy fixture matching across feeds. */
export function normalizeFixtureTeamName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return TEAM_ALIASES[base] ?? TEAM_ALIASES[name.toLowerCase().trim()] ?? base;
}

export function fixtureTeamsMatch(
  homeA: string,
  awayA: string,
  homeB: string,
  awayB: string,
): boolean {
  return (
    normalizeFixtureTeamName(homeA) === normalizeFixtureTeamName(homeB) &&
    normalizeFixtureTeamName(awayA) === normalizeFixtureTeamName(awayB)
  );
}

export type Wc2026ReportStatus = "not_started" | "in_progress" | "complete";

export type Wc2026BrandReportStatus = {
  brand: MatchReportTargetBrand;
  status: Wc2026ReportStatus;
  projectId?: string;
  displayLabel?: string;
  updatedAt?: string;
};

export type Wc2026ScheduleRow = Wc2026FixtureSeed & {
  brandReports: Wc2026BrandReportStatus[];
  brandDualStatuses: ScheduleBrandDualStatus[];
};

export function brandReportStatusFromIndex(
  brand: MatchReportTargetBrand,
  entries: SavedReportIndexEntry[],
  homeTeam: string,
  awayTeam: string,
): Wc2026BrandReportStatus {
  const match = entries.find(
    (entry) =>
      entry.targetBrand === brand &&
      fixtureTeamsMatch(homeTeam, awayTeam, entry.homeTeam, entry.awayTeam),
  );
  if (!match) return { brand, status: "not_started" };
  if (match.reportCompleted) {
    return {
      brand,
      status: "complete",
      projectId: match.projectId,
      displayLabel: match.displayLabel,
      updatedAt: match.updatedAt,
    };
  }
  return {
    brand,
    status: "in_progress",
    projectId: match.projectId,
    displayLabel: match.displayLabel,
    updatedAt: match.updatedAt,
  };
}

export function buildBrandReportsForFixture(
  fixture: Pick<Wc2026FixtureSeed, "homeTeam" | "awayTeam" | "targetBrands">,
  indexEntries: SavedReportIndexEntry[],
): Wc2026BrandReportStatus[] {
  return fixture.targetBrands.map((brand) =>
    brandReportStatusFromIndex(brand, indexEntries, fixture.homeTeam, fixture.awayTeam),
  );
}

export function aggregateWc2026ReportStatus(reports: Wc2026BrandReportStatus[]): Wc2026ReportStatus {
  if (reports.some((row) => row.status === "complete")) return "complete";
  if (reports.some((row) => row.status === "in_progress")) return "in_progress";
  return "not_started";
}
