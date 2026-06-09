import fs from "fs/promises";
import path from "path";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import {
  buildBrandReportsForEplFixture,
  type EplFixtureSeed,
  type EplScheduleRow,
} from "@/app/lib/match-report/premier-league-schedule";
import { buildWc2026GroupFixtures, fixtureTeamsMatch, type Wc2026FixtureSeed, type Wc2026ScheduleRow, buildBrandReportsForFixture } from "@/app/lib/match-report/wc2026-schedule";
import { SCHEDULE_EDITORIAL_BRANDS } from "@/app/lib/match-report/schedule-editorial-brands";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { buildScheduleBrandDualStatuses } from "@/app/lib/match-report/schedule-brand-status";
import type { MatchReportCalendarFixture, MatchReportProject, SavedReportIndexEntry } from "@/app/lib/match-report/types";

const STORE = "plexa-match-report";
const CALENDAR_KEY = "fixture-calendar";
const WC2026_KEY = "wc2026-fixtures";
const EPL_KEY = "epl-fixtures";
const LOCAL_CALENDAR_FILE = "fixture-calendar.json";
const LOCAL_WC2026_FILE = "wc2026-fixtures.json";
const LOCAL_EPL_FILE = "epl-fixtures.json";

type CalendarStore = { version: 1; fixtures: MatchReportCalendarFixture[] };
type Wc2026Store = { version: 1; updatedAt?: string; fixtures: Wc2026FixtureSeed[] };
type EplStore = { version: 1; updatedAt?: string; fixtures: EplFixtureSeed[] };

function emptyCalendar(): CalendarStore {
  return { version: 1, fixtures: [] };
}

function localDir(): string {
  return localJsonStorePath("plexa-match-report");
}

function localCalendarPath(): string {
  return path.join(localDir(), LOCAL_CALENDAR_FILE);
}

function localWc2026Path(): string {
  return path.join(localDir(), LOCAL_WC2026_FILE);
}

function localEplPath(): string {
  return path.join(localDir(), LOCAL_EPL_FILE);
}

async function readCalendarStore(): Promise<CalendarStore> {
  if (shouldUseNetlifyBlobStore()) {
    return (await readJsonBlob<CalendarStore>(STORE, CALENDAR_KEY)) ?? emptyCalendar();
  }
  try {
    const raw = await fs.readFile(localCalendarPath(), "utf-8");
    const parsed = JSON.parse(raw) as CalendarStore;
    return parsed?.fixtures ? parsed : emptyCalendar();
  } catch {
    return emptyCalendar();
  }
}

async function writeCalendarStore(store: CalendarStore): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(STORE, CALENDAR_KEY, store);
    return;
  }
  const full = localCalendarPath();
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(store, null, 2), "utf-8");
}

async function readWc2026Store(): Promise<Wc2026Store | null> {
  if (shouldUseNetlifyBlobStore()) {
    return readJsonBlob<Wc2026Store>(STORE, WC2026_KEY);
  }
  try {
    const raw = await fs.readFile(localWc2026Path(), "utf-8");
    return JSON.parse(raw) as Wc2026Store;
  } catch {
    return null;
  }
}

async function writeWc2026Store(store: Wc2026Store): Promise<void> {
  const next: Wc2026Store = { ...store, updatedAt: new Date().toISOString() };
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(STORE, WC2026_KEY, next);
    return;
  }
  const full = localWc2026Path();
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(next, null, 2), "utf-8");
}

async function readEplStore(): Promise<EplStore | null> {
  if (shouldUseNetlifyBlobStore()) {
    return readJsonBlob<EplStore>(STORE, EPL_KEY);
  }
  try {
    const raw = await fs.readFile(localEplPath(), "utf-8");
    return JSON.parse(raw) as EplStore;
  } catch {
    return null;
  }
}

async function writeEplStore(store: EplStore): Promise<void> {
  const next: EplStore = { ...store, updatedAt: new Date().toISOString() };
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(STORE, EPL_KEY, next);
    return;
  }
  const full = localEplPath();
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(next, null, 2), "utf-8");
}

function findSeedByProject<T extends { slug: string; sixLogicMatchId?: string | null; homeTeam: string; awayTeam: string }>(
  seeds: T[],
  project: MatchReportProject,
): T | undefined {
  if (project.matchId) {
    const byId = seeds.find((row) => row.sixLogicMatchId === project.matchId);
    if (byId) return byId;
  }
  return seeds.find((row) => fixtureTeamsMatch(row.homeTeam, row.awayTeam, project.homeTeam, project.awayTeam));
}

function mergeCalendarReportFields(
  calendarRow: MatchReportCalendarFixture | undefined,
  project: MatchReportProject,
): Partial<MatchReportCalendarFixture> {
  const completed = Boolean(project.mediaOutputs);
  return {
    reportProjectId: project.id,
    reportCompletedAt: completed ? project.updatedAt : calendarRow?.reportCompletedAt,
    reportDisplayLabel: completed ? project.displayLabel : calendarRow?.reportDisplayLabel,
    matchId: project.matchId || calendarRow?.matchId || "",
    sportId: project.sportId || calendarRow?.sportId || "1",
  };
}

async function syncWc2026FixtureFromProject(project: MatchReportProject): Promise<void> {
  const seeds = await getWc2026Fixtures();
  const seed = findSeedByProject(seeds, project);
  if (!seed) return;

  const seedIdx = seeds.findIndex((row) => row.slug === seed.slug);
  if (seedIdx < 0) return;

  const nextSeed: Wc2026FixtureSeed = {
    ...seeds[seedIdx]!,
    sixLogicMatchId: seeds[seedIdx]!.sixLogicMatchId || project.matchId,
    sixLogicSportId: project.sportId || seeds[seedIdx]!.sixLogicSportId,
  };
  seeds[seedIdx] = nextSeed;
  await writeWc2026Store({ version: 1, fixtures: seeds });

  const store = await readCalendarStore();
  const calendarIdx = store.fixtures.findIndex((row) => row.id === seed.slug);
  const calendarRow = calendarIdx >= 0 ? store.fixtures[calendarIdx] : wcSeedToCalendarRow(nextSeed);
  const merged: MatchReportCalendarFixture = {
    ...calendarRow,
    ...mergeCalendarReportFields(calendarRow, project),
    id: seed.slug,
    scheduleSlug: "wc2026",
    kickoffIso: nextSeed.kickoffIso,
    homeTeam: nextSeed.homeTeam,
    awayTeam: nextSeed.awayTeam,
    competition: nextSeed.competition,
    group: nextSeed.group,
    betwayMatchId: nextSeed.betwayMatchId ?? undefined,
    targetBrands: nextSeed.targetBrands,
  };
  if (calendarIdx >= 0) store.fixtures[calendarIdx] = merged;
  else store.fixtures.unshift(merged);
  await writeCalendarStore(store);
}

function eplSeedToCalendarRow(seed: EplFixtureSeed): MatchReportCalendarFixture {
  return {
    id: seed.slug,
    scheduleSlug: "epl",
    kickoffIso: seed.kickoffIso,
    homeTeam: seed.homeTeam,
    awayTeam: seed.awayTeam,
    competition: seed.competition,
    group: seed.group,
    sportId: seed.sixLogicSportId,
    matchId: seed.sixLogicMatchId ?? "",
    betwayMatchId: seed.betwayMatchId ?? undefined,
    targetBrands: seed.targetBrands,
  };
}

async function syncEplFixtureFromProject(project: MatchReportProject): Promise<void> {
  const seeds = await getEplFixtures();
  const seed = findSeedByProject(seeds, project);
  if (!seed) return;

  const seedIdx = seeds.findIndex((row) => row.slug === seed.slug);
  if (seedIdx < 0) return;

  const nextSeed: EplFixtureSeed = {
    ...seeds[seedIdx]!,
    sixLogicMatchId: seeds[seedIdx]!.sixLogicMatchId || project.matchId,
    sixLogicSportId: project.sportId || seeds[seedIdx]!.sixLogicSportId,
  };
  seeds[seedIdx] = nextSeed;
  await writeEplStore({ version: 1, fixtures: seeds });

  const store = await readCalendarStore();
  const calendarIdx = store.fixtures.findIndex((row) => row.id === seed.slug);
  const calendarRow = calendarIdx >= 0 ? store.fixtures[calendarIdx] : eplSeedToCalendarRow(nextSeed);
  const merged: MatchReportCalendarFixture = {
    ...calendarRow,
    ...mergeCalendarReportFields(calendarRow, project),
    id: seed.slug,
    scheduleSlug: "epl",
    kickoffIso: nextSeed.kickoffIso,
    homeTeam: nextSeed.homeTeam,
    awayTeam: nextSeed.awayTeam,
    competition: nextSeed.competition,
    group: nextSeed.group,
    betwayMatchId: nextSeed.betwayMatchId ?? undefined,
    targetBrands: nextSeed.targetBrands,
  };
  if (calendarIdx >= 0) store.fixtures[calendarIdx] = merged;
  else store.fixtures.unshift(merged);
  await writeCalendarStore(store);
}

function wcSeedToCalendarRow(seed: Wc2026FixtureSeed): MatchReportCalendarFixture {
  return {
    id: seed.slug,
    scheduleSlug: "wc2026",
    kickoffIso: seed.kickoffIso,
    homeTeam: seed.homeTeam,
    awayTeam: seed.awayTeam,
    competition: seed.competition,
    group: seed.group,
    sportId: seed.sixLogicSportId,
    matchId: seed.sixLogicMatchId ?? "",
    betwayMatchId: seed.betwayMatchId ?? undefined,
    targetBrands: seed.targetBrands,
  };
}

export async function getWc2026Fixtures(): Promise<Wc2026FixtureSeed[]> {
  const stored = await readWc2026Store();
  if (stored?.fixtures?.length) return stored.fixtures;
  return buildWc2026GroupFixtures();
}

export async function buildWc2026ScheduleRows(
  indexEntries: SavedReportIndexEntry[],
): Promise<Wc2026ScheduleRow[]> {
  const seeds = await getWc2026Fixtures();
  const calendar = await listMatchReportCalendarFixtures("wc2026");
  return seeds.map((seed) => {
    const calendarRow = calendar.find((row) => row.id === seed.slug);
    const sixLogicMatchId = seed.sixLogicMatchId ?? calendarRow?.matchId ?? null;
    const brands = [...SCHEDULE_EDITORIAL_BRANDS];
    return {
      ...seed,
      targetBrands: brands,
      sixLogicMatchId: sixLogicMatchId || null,
      betwayMatchId: seed.betwayMatchId ?? calendarRow?.betwayMatchId ?? null,
      brandReports: buildBrandReportsForFixture({ ...seed, targetBrands: brands }, indexEntries),
      brandDualStatuses: buildScheduleBrandDualStatuses(brands, indexEntries, seed.homeTeam, seed.awayTeam),
    };
  });
}

export async function updateWc2026Fixture(
  slug: string,
  patch: { sixLogicMatchId?: string | null; betwayMatchId?: string | null },
): Promise<Wc2026FixtureSeed | null> {
  const seeds = await getWc2026Fixtures();
  const idx = seeds.findIndex((row) => row.slug === slug);
  if (idx < 0) return null;

  const next: Wc2026FixtureSeed = {
    ...seeds[idx]!,
    ...(patch.sixLogicMatchId !== undefined ? { sixLogicMatchId: patch.sixLogicMatchId } : {}),
    ...(patch.betwayMatchId !== undefined ? { betwayMatchId: patch.betwayMatchId } : {}),
  };
  seeds[idx] = next;
  await writeWc2026Store({ version: 1, fixtures: seeds });

  const store = await readCalendarStore();
  const calendarIdx = store.fixtures.findIndex((row) => row.id === slug);
  const row = wcSeedToCalendarRow(next);
  if (calendarIdx >= 0) {
    store.fixtures[calendarIdx] = { ...store.fixtures[calendarIdx], ...row };
  } else {
    store.fixtures.unshift(row);
  }
  await writeCalendarStore(store);
  return next;
}

export async function importBetwayWc2026Schedule(): Promise<{ count: number; fixtures: Wc2026FixtureSeed[] }> {
  const { fetchBetwayWc2026Seeds } = await import("@/app/lib/match-report/fetch-betway-wc2026-fixtures");
  const seeds = await fetchBetwayWc2026Seeds();
  await writeWc2026Store({ version: 1, fixtures: seeds });
  await syncWc2026ScheduleToCalendar();
  return { count: seeds.length, fixtures: seeds };
}

export async function resolveWc2026IdsFromIndex(
  indexEntries: SavedReportIndexEntry[],
): Promise<{ updated: number; slugs: string[] }> {
  const seeds = await getWc2026Fixtures();
  const updatedSlugs: string[] = [];

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i]!;
    if (seed.sixLogicMatchId) continue;
    const match = indexEntries.find(
      (entry) =>
        entry.matchId &&
        fixtureTeamsMatch(seed.homeTeam, seed.awayTeam, entry.homeTeam, entry.awayTeam),
    );
    if (!match?.matchId) continue;
    seeds[i] = { ...seed, sixLogicMatchId: match.matchId };
    updatedSlugs.push(seed.slug);
  }

  if (updatedSlugs.length > 0) {
    await writeWc2026Store({ version: 1, fixtures: seeds });
    await syncWc2026ScheduleToCalendar();
  }

  return { updated: updatedSlugs.length, slugs: updatedSlugs };
}

export async function resolveEplIdsFromIndex(
  indexEntries: SavedReportIndexEntry[],
): Promise<{ updated: number; slugs: string[] }> {
  const seeds = await getEplFixtures();
  const updatedSlugs: string[] = [];

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i]!;
    if (seed.sixLogicMatchId) continue;
    const match = indexEntries.find(
      (entry) =>
        entry.matchId &&
        fixtureTeamsMatch(seed.homeTeam, seed.awayTeam, entry.homeTeam, entry.awayTeam),
    );
    if (!match?.matchId) continue;
    seeds[i] = { ...seed, sixLogicMatchId: match.matchId };
    updatedSlugs.push(seed.slug);
  }

  if (updatedSlugs.length > 0) {
    await writeEplStore({ version: 1, fixtures: seeds });
    await syncEplScheduleToCalendar();
  }

  return { updated: updatedSlugs.length, slugs: updatedSlugs };
}

export async function listMatchReportCalendarFixtures(scheduleSlug?: string): Promise<MatchReportCalendarFixture[]> {
  const store = await readCalendarStore();
  let rows = store.fixtures;
  if (scheduleSlug) rows = rows.filter((row) => row.scheduleSlug === scheduleSlug);
  if (scheduleSlug === "wc2026" && rows.length === 0) {
    const seeds = await getWc2026Fixtures();
    return seeds.map(wcSeedToCalendarRow);
  }
  if (scheduleSlug === "epl" && rows.length === 0) {
    const seeds = await getEplFixtures();
    return seeds.map(eplSeedToCalendarRow);
  }
  return [...rows].sort((a, b) => (a.kickoffIso ?? "").localeCompare(b.kickoffIso ?? ""));
}

function fixtureId(sportId: string, matchId: string): string {
  return `${sportId}-${matchId}`;
}

export async function registerMatchReportCalendarFixture(project: MatchReportProject): Promise<void> {
  const store = await readCalendarStore();
  const id = fixtureId(project.sportId, project.matchId);
  const existing = store.fixtures.find((row) => row.id === id);
  const preview = isMatchPreview(project);
  const next: MatchReportCalendarFixture = {
    id,
    kickoffIso: project.layers.sixLogic?.facts.kickoffIso,
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    competition: project.competition,
    sportId: project.sportId,
    matchId: project.matchId,
    targetBrands: [...new Set([...(existing?.targetBrands ?? []), project.editorial.targetBrand])],
    previewProjectId: preview ? project.id : existing?.previewProjectId,
    previewCompletedAt: preview && project.mediaOutputs ? project.updatedAt : existing?.previewCompletedAt,
    previewDisplayLabel:
      preview && project.mediaOutputs ? project.displayLabel : existing?.previewDisplayLabel,
    reportProjectId: preview ? existing?.reportProjectId : project.id,
    reportCompletedAt: !preview && project.mediaOutputs ? project.updatedAt : existing?.reportCompletedAt,
    reportDisplayLabel: !preview && project.mediaOutputs ? project.displayLabel : existing?.reportDisplayLabel,
  };
  store.fixtures = [next, ...store.fixtures.filter((row) => row.id !== id)];
  await writeCalendarStore(store);
  await syncWc2026FixtureFromProject(project).catch(() => undefined);
  await syncEplFixtureFromProject(project).catch(() => undefined);
}

export async function markMatchReportCalendarComplete(project: MatchReportProject): Promise<void> {
  const store = await readCalendarStore();
  const id = fixtureId(project.sportId, project.matchId);
  const idx = store.fixtures.findIndex((row) => row.id === id);
  const preview = isMatchPreview(project);
  const row: MatchReportCalendarFixture = {
    id,
    kickoffIso: project.layers.sixLogic?.facts.kickoffIso,
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    competition: project.competition,
    sportId: project.sportId,
    matchId: project.matchId,
    targetBrands: [project.editorial.targetBrand],
    previewProjectId: preview ? project.id : undefined,
    previewCompletedAt: preview ? project.updatedAt : undefined,
    previewDisplayLabel: preview ? project.displayLabel : undefined,
    reportProjectId: preview ? undefined : project.id,
    reportCompletedAt: preview ? undefined : project.updatedAt,
    reportDisplayLabel: preview ? undefined : project.displayLabel,
  };
  if (idx >= 0) {
    const existing = store.fixtures[idx]!;
    store.fixtures[idx] = {
      ...existing,
      ...row,
      previewProjectId: preview ? project.id : existing.previewProjectId,
      previewCompletedAt: preview ? project.updatedAt : existing.previewCompletedAt,
      previewDisplayLabel: preview ? project.displayLabel : existing.previewDisplayLabel,
      reportProjectId: preview ? existing.reportProjectId : project.id,
      reportCompletedAt: preview ? existing.reportCompletedAt : project.updatedAt,
      reportDisplayLabel: preview ? existing.reportDisplayLabel : project.displayLabel,
      targetBrands: [...new Set([...(existing.targetBrands ?? []), project.editorial.targetBrand])],
    };
  } else store.fixtures.unshift(row);
  await writeCalendarStore(store);
  await syncWc2026FixtureFromProject(project).catch(() => undefined);
  await syncEplFixtureFromProject(project).catch(() => undefined);
}

export async function upsertUpcomingCalendarFixture(input: {
  sportId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffIso?: string;
  competition?: string;
  group?: string;
  betwayMatchId?: string;
  targetBrands?: MatchReportCalendarFixture["targetBrands"];
  scheduleSlug?: string;
}): Promise<MatchReportCalendarFixture> {
  const store = await readCalendarStore();
  const id = input.scheduleSlug === "wc2026" && !input.matchId
    ? `${input.scheduleSlug}-${input.homeTeam}-${input.awayTeam}-${input.kickoffIso ?? "tbc"}`
    : fixtureId(input.sportId, input.matchId);
  const row: MatchReportCalendarFixture = {
    id,
    scheduleSlug: input.scheduleSlug,
    sportId: input.sportId,
    matchId: input.matchId,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    kickoffIso: input.kickoffIso,
    competition: input.competition,
    group: input.group,
    betwayMatchId: input.betwayMatchId,
    targetBrands: input.targetBrands,
  };
  store.fixtures = [row, ...store.fixtures.filter((f) => f.id !== id)];
  await writeCalendarStore(store);
  return row;
}

export async function syncWc2026ScheduleToCalendar(): Promise<number> {
  const seeds = await getWc2026Fixtures();
  const store = await readCalendarStore();
  const existingWc = store.fixtures.filter((row) => row.scheduleSlug === "wc2026");
  const wcRows = seeds.map((seed) => {
    const row = wcSeedToCalendarRow(seed);
    const prev =
      existingWc.find((r) => r.id === seed.slug) ??
      existingWc.find((r) => fixtureTeamsMatch(r.homeTeam, r.awayTeam, seed.homeTeam, seed.awayTeam));
    if (!prev) return row;
    return {
      ...row,
      reportProjectId: prev.reportProjectId,
      reportCompletedAt: prev.reportCompletedAt,
      reportDisplayLabel: prev.reportDisplayLabel,
    };
  });
  const other = store.fixtures.filter((row) => row.scheduleSlug !== "wc2026");
  store.fixtures = [...wcRows, ...other];
  await writeCalendarStore(store);
  return wcRows.length;
}

export async function getEplFixtures(): Promise<EplFixtureSeed[]> {
  const stored = await readEplStore();
  return stored?.fixtures?.length ? stored.fixtures : [];
}

export async function buildEplScheduleRows(indexEntries: SavedReportIndexEntry[]): Promise<EplScheduleRow[]> {
  const seeds = await getEplFixtures();
  const calendar = await listMatchReportCalendarFixtures("epl");
  return seeds.map((seed) => {
    const calendarRow = calendar.find((row) => row.id === seed.slug);
    const sixLogicMatchId = seed.sixLogicMatchId ?? calendarRow?.matchId ?? null;
    const brands = [...SCHEDULE_EDITORIAL_BRANDS];
    return {
      ...seed,
      targetBrands: brands,
      sixLogicMatchId: sixLogicMatchId || null,
      betwayMatchId: seed.betwayMatchId ?? calendarRow?.betwayMatchId ?? null,
      brandReports: buildBrandReportsForEplFixture({ ...seed, targetBrands: brands }, indexEntries),
      brandDualStatuses: buildScheduleBrandDualStatuses(brands, indexEntries, seed.homeTeam, seed.awayTeam),
    };
  });
}

export async function updateEplFixture(
  slug: string,
  patch: { sixLogicMatchId?: string | null; betwayMatchId?: string | null },
): Promise<EplFixtureSeed | null> {
  const seeds = await getEplFixtures();
  const idx = seeds.findIndex((row) => row.slug === slug);
  if (idx < 0) return null;

  const next: EplFixtureSeed = {
    ...seeds[idx]!,
    ...(patch.sixLogicMatchId !== undefined ? { sixLogicMatchId: patch.sixLogicMatchId } : {}),
    ...(patch.betwayMatchId !== undefined ? { betwayMatchId: patch.betwayMatchId } : {}),
  };
  seeds[idx] = next;
  await writeEplStore({ version: 1, fixtures: seeds });

  const store = await readCalendarStore();
  const calendarIdx = store.fixtures.findIndex((row) => row.id === slug);
  const row = eplSeedToCalendarRow(next);
  if (calendarIdx >= 0) {
    store.fixtures[calendarIdx] = { ...store.fixtures[calendarIdx], ...row };
  } else {
    store.fixtures.unshift(row);
  }
  await writeCalendarStore(store);
  return next;
}

export async function importBetwayEplSchedule(): Promise<{ count: number; fixtures: EplFixtureSeed[] }> {
  const { fetchBetwayListingFixtures } = await import("@/app/lib/match-report/fetch-betway-listing-fixtures");
  const {
    betwayEplFixturesToSeeds,
    enrichBetwayEplFixture,
    EPL_BETWAY_UPCOMINGS_URL,
  } = await import("@/app/lib/match-report/premier-league-schedule");
  const parsed = await fetchBetwayListingFixtures(EPL_BETWAY_UPCOMINGS_URL, enrichBetwayEplFixture);
  const seeds = betwayEplFixturesToSeeds(parsed);
  await writeEplStore({ version: 1, fixtures: seeds });
  await syncEplScheduleToCalendar();
  return { count: seeds.length, fixtures: seeds };
}

export async function syncEplScheduleToCalendar(): Promise<number> {
  const seeds = await getEplFixtures();
  const store = await readCalendarStore();
  const existing = store.fixtures.filter((row) => row.scheduleSlug === "epl");
  const eplRows = seeds.map((seed) => {
    const row = eplSeedToCalendarRow(seed);
    const prev =
      existing.find((r) => r.id === seed.slug) ??
      existing.find((r) => fixtureTeamsMatch(r.homeTeam, r.awayTeam, seed.homeTeam, seed.awayTeam));
    if (!prev) return row;
    return {
      ...row,
      reportProjectId: prev.reportProjectId,
      reportCompletedAt: prev.reportCompletedAt,
      reportDisplayLabel: prev.reportDisplayLabel,
    };
  });
  const other = store.fixtures.filter((row) => row.scheduleSlug !== "epl");
  store.fixtures = [...eplRows, ...other];
  await writeCalendarStore(store);
  return eplRows.length;
}
