export type ScheduleCompetitionId = "wc2026" | "epl";

export type ScheduleFixtureRow = {
  slug: string;
  date: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  sixLogicMatchId?: string | null;
  betwayMatchId?: string | null;
  sixLogicSportId: string;
};

export const SCHEDULE_COMPETITION_TABS: Array<{ id: ScheduleCompetitionId; label: string }> = [
  { id: "wc2026", label: "World Cup 2026" },
  { id: "epl", label: "Premier League" },
];

export const SCHEDULE_COMPETITION_META: Record<
  ScheduleCompetitionId,
  { apiPath: string; showGroupFilter: boolean }
> = {
  wc2026: {
    apiPath: "/api/match-report/wc2026-schedule",
    showGroupFilter: true,
  },
  epl: {
    apiPath: "/api/match-report/epl-schedule",
    showGroupFilter: false,
  },
};

export function parseScheduleCompetitionId(value: string | null | undefined): ScheduleCompetitionId {
  if (value === "epl" || value === "wc2026") return value;
  return "epl";
}

export function formatScheduleFixtureLabel(fixture: ScheduleFixtureRow): string {
  const match = `${fixture.homeTeam} vs ${fixture.awayTeam}`;
  const group = fixture.group && fixture.group !== "EPL" ? ` · Group ${fixture.group}` : "";
  const id = fixture.sixLogicMatchId ? ` · ID ${fixture.sixLogicMatchId}` : " · No SixLogics ID yet";
  return `${fixture.date}${group} · ${match}${id}`;
}
