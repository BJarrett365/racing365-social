import { getEplFixtures, getWc2026Fixtures } from "@/app/lib/match-report/fixture-calendar";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import { defaultFixturePhases, fixtureTitle, normalizeKickoffIso } from "@/app/lib/editorial-calendar/phases";
import type { EditorialCalendarEvent } from "@/app/lib/editorial-calendar/types";
import { listEditorialCalendarEvents, upsertEditorialCalendarEvents } from "@/app/lib/editorial-calendar/store";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import { editingStudioBrandForMatchReportBrand } from "@/features/editing-studio/utils/fixture-routes";

function stableFixtureEventId(scheduleSlug: string, fixtureSlug: string): string {
  return `cal-fix-${scheduleSlug}-${fixtureSlug}`;
}

function mergeFixtureEvent(existing: EditorialCalendarEvent | undefined, next: EditorialCalendarEvent): EditorialCalendarEvent {
  if (!existing) return next;
  return {
    ...next,
    id: existing.id,
    phases: existing.phases?.length ? existing.phases : next.phases,
    contentLinks: existing.contentLinks ?? next.contentLinks,
    distribution: existing.distribution ?? next.distribution,
    notes: existing.notes ?? next.notes,
    status: existing.status ?? next.status,
    createdAt: existing.createdAt,
  };
}

function seedToEvent(
  scheduleSlug: "wc2026" | "epl",
  seed: {
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
  },
  existingByFixtureSlug: Map<string, EditorialCalendarEvent>,
): EditorialCalendarEvent {
  const ts = new Date().toISOString();
  const fixtureSlug = seed.slug;
  const existing =
    existingByFixtureSlug.get(`${scheduleSlug}:${fixtureSlug}`) ??
    [...existingByFixtureSlug.values()].find(
      (row) =>
        row.scheduleSlug === scheduleSlug &&
        row.homeTeam === seed.homeTeam &&
        row.awayTeam === seed.awayTeam,
    );

  const base: EditorialCalendarEvent = {
    id: existing?.id ?? stableFixtureEventId(scheduleSlug, fixtureSlug),
    type: "fixture",
    sport: "football",
    title: fixtureTitle(seed.homeTeam, seed.awayTeam),
    startAt: normalizeKickoffIso(seed.date, seed.kickoffIso),
    brands: seed.targetBrands.map((brand) => editingStudioBrandForMatchReportBrand(brand)),
    competition: seed.competition,
    group: seed.group,
    homeTeam: seed.homeTeam,
    awayTeam: seed.awayTeam,
    scheduleSlug,
    fixtureSlug,
    externalIds: {
      betwayMatchId: seed.betwayMatchId ?? undefined,
      sixLogicMatchId: seed.sixLogicMatchId ?? undefined,
      sixLogicSportId: seed.sixLogicSportId,
    },
    phases: defaultFixturePhases(),
    status: "planned",
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };

  return mergeFixtureEvent(existing, base);
}

export async function syncFixturesToEditorialCalendar(): Promise<{
  wcCount: number;
  eplCount: number;
  total: number;
}> {
  const [wcSeeds, eplSeeds, existingEvents] = await Promise.all([
    getWc2026Fixtures(),
    getEplFixtures(),
    listEditorialCalendarEvents(),
  ]);

  const existingByFixtureSlug = new Map<string, EditorialCalendarEvent>();
  for (const event of existingEvents) {
    if (event.type === "fixture" && event.scheduleSlug && event.fixtureSlug) {
      existingByFixtureSlug.set(`${event.scheduleSlug}:${event.fixtureSlug}`, event);
    }
  }

  const wcEvents = wcSeeds.map((seed) => seedToEvent("wc2026", seed, existingByFixtureSlug));
  const eplEvents = eplSeeds.map((seed) => seedToEvent("epl", seed, existingByFixtureSlug));
  const merged = [...wcEvents, ...eplEvents];

  await upsertEditorialCalendarEvents(merged);
  return { wcCount: wcEvents.length, eplCount: eplEvents.length, total: merged.length };
}

/** Ensure manual fixture rows get unique ids when not from sync. */
export function newManualCalendarEventId(): string {
  return newEditingStudioId("cal");
}
