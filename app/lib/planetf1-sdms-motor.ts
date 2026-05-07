/**
 * PlanetF1 results pages embed `data-slug="japanese-grand-prix"`; data is loaded from
 * Planet Sport SDMS motor API (same as `race-results.js`).
 */

import type { F1FastestLap, F1GridBundle, F1GridDriver, F1ResultsBundle, F1ResultsDriver } from "@/types";

const SDMS_RACES = "https://sdms.planetsport.com/api/motor/seasons/races";

export type SdmsMotorRace = {
  race_id: number;
  race_name: string;
  venue_name: string;
  country?: string;
  country_code?: string;
  sessions?: string[];
};

export type SdmsMotorResultRow = {
  gap?: string;
  pos: string;
  laps?: string;
  name: string;
  pits?: string;
  team: string;
  time: string;
  point?: number;
  team_slug?: string;
  driver_slug?: string;
};

/** Typical F1 2025+ team colours — keys match SDMS `team_slug`. */
const TEAM_HEX: Record<string, string> = {
  mercedes: "#00D2BE",
  mclaren: "#FF8700",
  ferrari: "#DC0000",
  "red-bull": "#0600EF",
  redbull: "#0600EF",
  alpine: "#0090FF",
  "racing-bulls": "#1E41FF",
  haas: "#E10600",
  audi: "#D50000",
  cadillac: "#C9A227",
  williams: "#005AFF",
  "aston-martin": "#006F62",
};

function teamColor(slug: string | undefined): string {
  const k = (slug ?? "").toLowerCase().trim();
  return TEAM_HEX[k] ?? "#64748b";
}

function slugifySegment(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Accepts full URL, `/results/slug`, or slug segment, e.g. `japanese-grand-prix`. */
export function extractPlanetF1ResultsSlug(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      if (!/planetf1\.com$/i.test(u.hostname) && !u.hostname.endsWith(".planetf1.com")) {
        return null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("results");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]!.toLowerCase();
      return null;
    } catch {
      return null;
    }
  }
  const parts = raw.replace(/^\/+/, "").split("/").filter(Boolean);
  const idx = parts.indexOf("results");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]!.toLowerCase();
  const seg = parts[parts.length - 1];
  return seg ? seg.toLowerCase() : null;
}

export async function fetchMotorRaces(): Promise<SdmsMotorRace[]> {
  const res = await fetch(SDMS_RACES, {
    headers: { Accept: "application/json", "User-Agent": "PlanetSportStudioPlanetF1Import/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`SDMS races HTTP ${res.status}`);
  const json = (await res.json()) as { data?: SdmsMotorRace[] };
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows;
}

export function findRaceByPlanetSlug(slug: string, races: SdmsMotorRace[]): SdmsMotorRace | null {
  const want = slugifySegment(slug.replace(/-/g, " "));
  for (const r of races) {
    const fromName = slugifySegment(r.race_name.replace(/\s+Grand Prix\s*$/i, "").trim());
    const fullName = slugifySegment(r.race_name);
    if (fromName === want || fullName === want || slugifySegment(slug) === fromName) return r;
  }
  const token = slug.split("-")[0] ?? "";
  if (token.length > 2) {
    const hit = races.find((r) => r.race_name.toLowerCase().includes(token));
    if (hit) return hit;
  }
  return null;
}

export async function fetchMotorSession(
  raceId: number,
  session: "G1" | "R1",
): Promise<SdmsMotorResultRow[]> {
  const url = `https://sdms.planetsport.com/api/motor/results/${raceId}/${session}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "PlanetSportStudioPlanetF1Import/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`SDMS results (${session}) HTTP ${res.status}`);
  const json = (await res.json()) as { data?: SdmsMotorResultRow[] };
  return Array.isArray(json?.data) ? json.data : [];
}

function subtitleFromRace(r: SdmsMotorRace): string {
  const base = r.race_name.replace(/\s+Grand Prix\s*$/i, "").trim();
  return `${base.toUpperCase()} GP`;
}

function driverImageRel(driverSlug: string | undefined): string | undefined {
  const s = (driverSlug ?? "").trim();
  if (!s) return undefined;
  return `/grid/drivers/${s}.png`;
}

export function buildF1GridBundleFromSdms(
  race: SdmsMotorRace,
  rows: SdmsMotorResultRow[],
  contentIdSuffix: string,
): F1GridBundle {
  const slug = slugifySegment(race.race_name);
  const drivers: F1GridDriver[] = rows.map((row, i) => {
    const posNum = Number.parseInt(String(row.pos), 10);
    const position = Number.isFinite(posNum) ? posNum : i + 1;
    return {
      position,
      name: String(row.name || "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim(),
      time: (row.time ?? "—").replace(/\s+/g, " ").trim(),
      teamColor: teamColor(row.team_slug),
      tag: "",
      image: driverImageRel(row.driver_slug),
    };
  });

  return {
    id: `planetf1-${contentIdSuffix}-grid`,
    title: "STARTING GRID",
    subtitle: subtitleFromRace(race),
    rowsPerPage: 11,
    footerBrand: "PLANETF1.com",
    introLine: `Qualifying — ${race.venue_name ?? race.race_name}.`,
    outroLine: "Lights out — follow every session on PLANETF1.com",
    drivers,
  };
}

export function buildF1ResultsBundleFromSdms(
  race: SdmsMotorRace,
  rows: SdmsMotorResultRow[],
  contentIdSuffix: string,
): F1ResultsBundle {
  const drivers: F1ResultsDriver[] = rows.map((row, idx) => {
    const posRaw = String(row.pos ?? "").trim();
    const numeric = /^\d+$/.test(posRaw);
    const posNum = numeric ? Number.parseInt(posRaw, 10) : NaN;
    const position = numeric ? posNum : idx + 1;
    const positionLabel = numeric ? undefined : posRaw || undefined;
    const pits = row.pits != null && String(row.pits).trim() !== "" ? Number(row.pits) || row.pits : 1;
    return {
      position,
      ...(positionLabel ? { positionLabel } : {}),
      name: String(row.name || "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim(),
      team: String(row.team ?? "").trim(),
      time: (row.time ?? "—").replace(/\s+/g, " ").trim(),
      stops: pits,
      teamColor: teamColor(row.team_slug),
      image: driverImageRel(row.driver_slug),
    };
  });

  const leader = rows[0];
  const fastestLap: F1FastestLap = leader
    ? {
        driverName: String(leader.name || "")
          .toUpperCase()
          .replace(/\s+/g, " ")
          .trim(),
        team: String(leader.team ?? "").trim(),
        time: (leader.time ?? leader.gap ?? "—").replace(/\s+/g, " ").trim(),
        stops: leader.pits != null ? Number(leader.pits) || leader.pits : 1,
        teamColor: teamColor(leader.team_slug),
        image: driverImageRel(leader.driver_slug),
      }
    : {
        driverName: "—",
        team: "—",
        time: "—",
        stops: 0,
        teamColor: "#64748b",
      };

  return {
    id: `planetf1-${contentIdSuffix}-results`,
    title: "RACE RESULTS",
    subtitle: subtitleFromRace(race),
    rowsPerPage: 11,
    footerBrand: "PLANETF1.com",
    introLine: `Classification — ${race.venue_name ?? race.race_name}.`,
    outroLine: "Thanks for watching — follow every session on PLANETF1.com",
    drivers,
    fastestLap,
  };
}
