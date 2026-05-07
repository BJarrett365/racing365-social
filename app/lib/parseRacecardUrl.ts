/**
 * URL validation + PlanetSport / GetRace mapping for Racecard URL import (Planet Sport Studio).
 * Keeps parsing in small testable pieces; no DOM APIs (safe on server).
 */

import type { Race, RacecardSnapshot, Runner, RunnerSilks } from "@/types";

const PLANETSPORT_BASE = "https://rsapi.racingandsports.com/api/PlanetSport";

export type RacecardImportSource = "url" | "manual";

/** Intermediate runner shape before mapping to `Runner` */
export type ParsedRacecardRunner = {
  id: string;
  number?: string;
  horseName: string;
  odds?: string;
  silkUrl?: string;
  silkBg?: string;
  silkFg?: string;
  isTopPick?: boolean;
};

/** Preview / staging shape (aligned with product spec) */
export type RacecardTemplatePreview = {
  id: string;
  course: string;
  raceTime: string;
  raceTitle: string;
  runnerCount: number;
  topPicks: string[];
  runners: ParsedRacecardRunner[];
  sourceType: RacecardImportSource;
  sourceUrl?: string;
  rawSource?: unknown;
  createdAt: string;
};

export class RacecardUrlImportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "empty"
      | "invalid_url"
      | "fetch_failed"
      | "blocked"
      | "unsupported"
      | "parse_failed"
      | "missing_race"
      | "no_runners",
  ) {
    super(message);
    this.name = "RacecardUrlImportError";
  }
}

export function validateRacecardUrl(raw: string): URL {
  const t = raw.trim();
  if (!t) throw new RacecardUrlImportError("Please enter a valid URL", "empty");
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new RacecardUrlImportError("Please enter a valid URL", "invalid_url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new RacecardUrlImportError("Please enter a valid URL", "invalid_url");
  }
  return u;
}

/** Extract numeric race id from common Racing365 / Planet Sport Studio style URLs and HTML snippets */
export function extractPlanetSportRaceIdFromUrl(url: URL): number | null {
  const q = url.searchParams.get("raceId") ?? url.searchParams.get("RaceID");
  if (q) {
    const n = Number(String(q).replace(/\D/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const m = url.pathname.match(/(?:race|Race)[_-]?(\d{5,})/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function extractPlanetSportRaceIdFromHtml(html: string): number | null {
  const m = html.match(/"RaceID"\s*:\s*(\d{4,})/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const m2 = html.match(/raceId[=:](\d{4,})/i);
  if (m2) {
    const n = Number(m2[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** First-stage HTML inspection: embedded ids / JSON hints (no full DOM parse). */
export function parseRacecardFromHtml(
  html: string,
  _pageUrl: string,
): { raceId: number | null; hints: string[] } {
  const hints: string[] = [];
  const raceId = extractPlanetSportRaceIdFromHtml(html);
  if (raceId) hints.push("planetSportRaceId");
  return { raceId, hints };
}

export const normalizeRacecardData = normalizePlanetSportGetRace;
export const validateRacecardTemplate = validateRacecardTemplateForImport;

export type PlanetSportRunnerRow = Record<string, unknown>;
export type PlanetSportRacePayload = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : "";
}

function oddsFromRunner(r: PlanetSportRunnerRow): string {
  const direct = str(r.WinOdds) || str(r.FixOdds) || str(r.MorningLine) || str(r.SP);
  if (direct) return direct;
  const form = r.Form;
  if (Array.isArray(form) && form.length > 0) {
    const last = form[0] as Record<string, unknown>;
    const wsp = str(last.WSP);
    if (wsp) return wsp;
  }
  return "—";
}

function scratched(r: PlanetSportRunnerRow): boolean {
  const s = str(r.Scratched).toUpperCase();
  return s === "Y" || s === "TRUE";
}

function mapToRunners(rows: PlanetSportRunnerRow[], topTabs: Set<string>): ParsedRacecardRunner[] {
  const out: ParsedRacecardRunner[] = [];
  let i = 0;
  for (const r of rows) {
    if (scratched(r)) continue;
    const horseName = str(r.HorseName);
    if (!horseName) continue;
    const tab = r.RunnerTab;
    const num =
      typeof tab === "number" && Number.isFinite(tab)
        ? String(tab)
        : str(tab) || String(++i);
    const silkUrl = str(r.Silk) || undefined;
    out.push({
      id: `r-${num}-${horseName}`.replace(/\s+/g, "-").slice(0, 80),
      number: num,
      horseName,
      odds: oddsFromRunner(r),
      silkUrl,
      isTopPick: topTabs.has(num),
    });
    i += 1;
  }
  return out;
}

function topPickTabsFromSelections(selections: string): Set<string> {
  const s = new Set<string>();
  for (const part of selections.split(/[\s,-]+/)) {
    const t = part.trim();
    if (/^\d+$/.test(t)) s.add(t);
  }
  return s;
}

function topPickHorseNames(
  runners: ParsedRacecardRunner[],
  selections: string,
): string[] {
  if (!selections.trim()) return [];
  const byNum = new Map(runners.filter((x) => x.number).map((x) => [x.number!, x.horseName]));
  const names: string[] = [];
  for (const t of selections.split(/[-]/)) {
    const tab = t.trim();
    if (!/^\d+$/.test(tab)) continue;
    const name = byNum.get(tab);
    if (name) names.push(name);
  }
  return names;
}

/** Map PlanetSport `GetRace/{id}` JSON → preview template */
export function normalizePlanetSportGetRace(
  api: PlanetSportRacePayload,
  sourceUrl: string,
): RacecardTemplatePreview {
  const raceId = Number(api.RaceID);
  if (!Number.isFinite(raceId) || raceId <= 0) {
    throw new RacecardUrlImportError("The racecard is missing key data", "missing_race");
  }
  const rawRunners = api.Runners;
  if (!Array.isArray(rawRunners) || rawRunners.length === 0) {
    throw new RacecardUrlImportError("No valid runners were found", "no_runners");
  }
  const selections = str(api.Selections);
  const topTabs = topPickTabsFromSelections(selections);
  const runners = mapToRunners(rawRunners as PlanetSportRunnerRow[], topTabs);
  if (runners.length === 0) {
    throw new RacecardUrlImportError("No valid runners were found", "no_runners");
  }
  const course = str(api.Course) || "Unknown course";
  const raceTime = str(api.Time) || "—";
  const raceTitle = str(api.RaceName) || "Race";
  let topPicks = topPickHorseNames(runners, selections);
  if (topPicks.length === 0 && runners.length >= 2) {
    topPicks = [runners[0]!.horseName, runners[1]!.horseName];
  } else if (topPicks.length === 0 && runners.length === 1) {
    topPicks = [runners[0]!.horseName];
  }

  return {
    id: `import-${raceId}-${Date.now()}`,
    course,
    raceTime,
    raceTitle,
    runnerCount: runners.length,
    topPicks,
    runners,
    sourceType: "url",
    sourceUrl,
    rawSource: api,
    createdAt: new Date().toISOString(),
  };
}

/** Convert preview → `RacecardSnapshot` for editor / disk (caller sets `id`) */
export function racecardTemplatePreviewToSnapshot(
  preview: RacecardTemplatePreview,
  tplId: string,
): RacecardSnapshot {
  const runners: Runner[] = preview.runners.map((r, idx) => {
    const n = Number(r.number);
    const number = Number.isFinite(n) && n > 0 ? n : idx + 1;
    const silks: RunnerSilks | undefined = r.silkUrl
      ? { imageUrl: r.silkUrl, provider: "import" }
      : undefined;
    return {
      number,
      horse: r.horseName,
      odds: r.odds && r.odds !== "—" ? r.odds : "—",
      silks,
    };
  });

  const race: Race = {
    id: String((preview.rawSource as PlanetSportRacePayload)?.RaceID ?? tplId),
    course: preview.course,
    raceTime: preview.raceTime,
    title: preview.raceTitle,
    distance: str((preview.rawSource as PlanetSportRacePayload)?.DisplayDistance) || "",
    going: str((preview.rawSource as PlanetSportRacePayload)?.RaceSOT) || "",
    runnersCount: runners.length,
    raceDate: str((preview.rawSource as PlanetSportRacePayload)?.Date) || undefined,
  };

  return {
    id: tplId,
    race,
    runners,
    topPicks: preview.topPicks.length ? preview.topPicks : runners.slice(0, 3).map((x) => x.horse),
    boardRunnersPerPage: 11,
    importSource: "url",
    sourceUrl: preview.sourceUrl,
    rawImport: preview.rawSource,
  };
}

export function validateRacecardTemplateForImport(preview: RacecardTemplatePreview): void {
  if (!preview.course?.trim()) {
    throw new RacecardUrlImportError("The racecard is missing key data", "missing_race");
  }
  if (!preview.raceTime?.trim()) {
    throw new RacecardUrlImportError("The racecard is missing key data", "missing_race");
  }
  if (!preview.raceTitle?.trim()) {
    throw new RacecardUrlImportError("The racecard is missing key data", "missing_race");
  }
  if (!preview.runners?.length) {
    throw new RacecardUrlImportError("No valid runners were found", "no_runners");
  }
  if (!preview.runners.some((r) => r.horseName?.trim())) {
    throw new RacecardUrlImportError("No valid runners were found", "no_runners");
  }
}

export async function fetchPlanetSportRaceJson(raceId: number): Promise<PlanetSportRacePayload> {
  const url = `${PLANETSPORT_BASE}/GetRace/${raceId}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      throw new RacecardUrlImportError("We could not fetch data from this page", "blocked");
    }
    throw new RacecardUrlImportError("We could not fetch data from this page", "fetch_failed");
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new RacecardUrlImportError("We found the page but could not parse a racecard", "parse_failed");
  }
  if (!data || typeof data !== "object") {
    throw new RacecardUrlImportError("We found the page but could not parse a racecard", "unsupported");
  }
  return data as PlanetSportRacePayload;
}

/** Fetch HTML (SPA shell) and resolve race id when query param missing */
export async function fetchRacecardSource(url: string): Promise<{ html: string; finalUrl: string }> {
  const u = validateRacecardUrl(url);
  const res = await fetch(u.toString(), {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "PlanetSportStudioRacecardImport/1.0" },
    redirect: "follow",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new RacecardUrlImportError("We could not fetch data from this page", "fetch_failed");
  }
  const html = await res.text();
  return { html, finalUrl: res.url || u.toString() };
}

/** Resolve a display URL → PlanetSport `GetRace/{id}` JSON (shared by racecard + Next off / Fast results import). */
export async function fetchPlanetSportRacePayloadFromUrl(
  url: string,
): Promise<{ api: PlanetSportRacePayload; sourceUrl: string }> {
  const u = validateRacecardUrl(url);
  let raceId = extractPlanetSportRaceIdFromUrl(u);
  if (!raceId) {
    try {
      const { html } = await fetchRacecardSource(u.toString());
      raceId = extractPlanetSportRaceIdFromHtml(html);
    } catch (e) {
      if (e instanceof RacecardUrlImportError) throw e;
      throw new RacecardUrlImportError("We could not fetch data from this page", "fetch_failed");
    }
  }
  if (!raceId) {
    throw new RacecardUrlImportError("We found the page but could not parse a racecard", "unsupported");
  }
  const api = await fetchPlanetSportRaceJson(raceId);
  return { api, sourceUrl: u.toString() };
}

/**
 * End-to-end: validate URL → fetch PlanetSport JSON (via raceId from URL or HTML) → preview.
 */
export async function parseRacecardFromUrl(url: string): Promise<RacecardTemplatePreview> {
  const { api, sourceUrl } = await fetchPlanetSportRacePayloadFromUrl(url);
  const preview = normalizePlanetSportGetRace(api, sourceUrl);
  validateRacecardTemplateForImport(preview);
  return preview;
}
