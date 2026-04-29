/**
 * Map PlanetSport GetRace JSON → Next off / Fast results template drafts (URL import).
 * Reuses racecard normalisation for runners, selections, and silks.
 */

import type { FastResultBundle, NextOffBundle, Placing, Race, RunnerSilks, Tip } from "@/types";
import type {
  ParsedRacecardRunner,
  PlanetSportRacePayload,
  PlanetSportRunnerRow,
  RacecardTemplatePreview,
} from "@/app/lib/parseRacecardUrl";
import {
  normalizePlanetSportGetRace,
  validateRacecardTemplateForImport,
} from "@/app/lib/parseRacecardUrl";

function scratchedRow(r: PlanetSportRunnerRow): boolean {
  const s = String(r.Scratched ?? "")
    .trim()
    .toUpperCase();
  return s === "Y" || s === "TRUE";
}

function oddsFromRow(r: PlanetSportRunnerRow): string {
  const direct =
    String(r.WinOdds ?? "").trim() ||
    String(r.FixOdds ?? "").trim() ||
    String(r.MorningLine ?? "").trim() ||
    String(r.SP ?? "").trim();
  return direct || "—";
}

function silkFromUrl(url?: string): RunnerSilks | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  return { imageUrl: u, provider: "import" };
}

function raceFromPreview(preview: RacecardTemplatePreview, idFallback: string): Race {
  const api = preview.rawSource as PlanetSportRacePayload | undefined;
  return {
    id: String(api?.RaceID ?? idFallback),
    course: preview.course,
    raceTime: preview.raceTime,
    title: preview.raceTitle,
    distance: typeof api?.DisplayDistance === "string" ? String(api.DisplayDistance).trim() : "",
    going: typeof api?.RaceSOT === "string" ? String(api.RaceSOT).trim() : "",
    runnersCount: preview.runnerCount,
    raceDate: typeof api?.Date === "string" ? String(api.Date).trim() || undefined : undefined,
  };
}

/** Build three tips: API selections / top picks first, then fill from runner list. */
export function buildNextOffBundleDraftFromPlanetSport(
  api: PlanetSportRacePayload,
  sourceUrl: string,
): Omit<NextOffBundle, "id"> {
  const preview = normalizePlanetSportGetRace(api, sourceUrl);
  validateRacecardTemplateForImport(preview);
  const race = raceFromPreview(preview, "import");
  const names: string[] = [];
  for (const n of preview.topPicks) {
    const t = n.trim();
    if (t && !names.includes(t)) names.push(t);
  }
  for (const r of preview.runners) {
    if (names.length >= 3) break;
    const h = r.horseName.trim();
    if (h && !names.includes(h)) names.push(h);
  }
  const tips: Tip[] = names.slice(0, 3).map((horseName, i) => {
    const pr =
      preview.runners.find((x) => x.horseName === horseName) ?? preview.runners[Math.min(i, preview.runners.length - 1)]!;
    const silks: RunnerSilks | undefined = pr.silkUrl ? { imageUrl: pr.silkUrl, provider: "import" } : undefined;
    return {
      horse: pr.horseName,
      odds: pr.odds && pr.odds !== "—" ? pr.odds : "—",
      stars: Math.max(2, 5 - i),
      race,
      silks,
      kicker: `Tip ${i + 1}`,
    };
  });
  return { race, tips };
}

function officialPlace(r: PlanetSportRunnerRow): number | null {
  const tryNum = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
    if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
    return null;
  };
  const o = r as Record<string, unknown>;
  for (const key of ["OfficialPlace", "Place", "RacePlace", "FinishingPosition", "FP", "FinishPos"] as const) {
    const n = tryNum(o[key]);
    if (n != null) return n;
  }
  return null;
}

/** When the API has no finishing order, order placings from Selections tab order then remaining runners. */
function fallbackPlacingsFromPreview(preview: RacecardTemplatePreview): Placing[] {
  const api = preview.rawSource as PlanetSportRacePayload | undefined;
  const selections = String(api?.Selections ?? "");
  const byNum = new Map<string, ParsedRacecardRunner>();
  for (const pr of preview.runners) {
    if (pr.number) byNum.set(pr.number, pr);
  }
  const placings: Placing[] = [];
  for (const part of selections.split(/[-]+/)) {
    const tab = part.trim();
    if (!/^\d+$/.test(tab)) continue;
    const pr = byNum.get(tab);
    if (!pr) continue;
    placings.push({
      position: placings.length + 1,
      horse: pr.horseName,
      sp: pr.odds && pr.odds !== "—" ? pr.odds : "—",
      silks: pr.silkUrl ? { imageUrl: pr.silkUrl, provider: "import" } : undefined,
    });
    if (placings.length >= 4) break;
  }
  for (const pr of preview.runners) {
    if (placings.length >= 4) break;
    if (placings.some((p) => p.horse === pr.horseName)) continue;
    placings.push({
      position: placings.length + 1,
      horse: pr.horseName,
      sp: pr.odds && pr.odds !== "—" ? pr.odds : "—",
      silks: pr.silkUrl ? { imageUrl: pr.silkUrl, provider: "import" } : undefined,
    });
  }
  while (placings.length < 4) {
    placings.push({ position: placings.length + 1, horse: `—`, sp: "—" });
  }
  return placings.slice(0, 4);
}

function placingsFromPlanetSport(api: PlanetSportRacePayload, preview: RacecardTemplatePreview): Placing[] {
  const raw = api.Runners;
  if (!Array.isArray(raw)) return fallbackPlacingsFromPreview(preview);
  const rows = raw.filter((x) => !scratchedRow(x as PlanetSportRunnerRow)) as PlanetSportRunnerRow[];
  const scored = rows
    .map((r) => ({ r, p: officialPlace(r) }))
    .filter((x): x is { r: PlanetSportRunnerRow; p: number } => x.p != null)
    .sort((a, b) => a.p - b.p);
  if (scored.length && scored[0]!.p === 1) {
    const top = scored.filter((x) => x.p >= 1 && x.p <= 8).slice(0, 4);
    return top.map(({ r, p }) => {
      const horse = String(r.HorseName ?? "").trim();
      return {
        position: p,
        horse: horse || "—",
        sp: oddsFromRow(r),
        silks: silkFromUrl(String(r.Silk ?? "").trim() || undefined),
      };
    });
  }
  return fallbackPlacingsFromPreview(preview);
}

export function buildFastResultBundleDraftFromPlanetSport(
  api: PlanetSportRacePayload,
  sourceUrl: string,
): Omit<FastResultBundle, "id"> {
  const preview = normalizePlanetSportGetRace(api, sourceUrl);
  validateRacecardTemplateForImport(preview);
  const race = raceFromPreview(preview, "import");
  const placings = placingsFromPlanetSport(api, preview);
  const sorted = [...placings].sort((a, b) => a.position - b.position);
  const winRow = sorted.find((p) => p.position === 1) ?? sorted[0];
  const winner =
    winRow?.horse?.trim() || preview.topPicks[0]?.trim() || preview.runners[0]?.horseName || "";
  const sp =
    (winRow?.sp && winRow.sp !== "—" ? winRow.sp : null) ||
    (preview.runners[0]?.odds && preview.runners[0].odds !== "—" ? preview.runners[0].odds : null) ||
    "—";
  return {
    result: {
      race,
      winner,
      sp,
      placings,
    },
  };
}
