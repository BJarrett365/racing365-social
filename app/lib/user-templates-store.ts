import fs from "fs/promises";
import path from "path";
import { defaultSilksForIndex } from "@/app/lib/silk-presets";
import type {
  F1GridBundle,
  F1ResultsBundle,
  FastResultBundle,
  NextOffBundle,
  PlanetFootballTableBundle,
  PlanetRugbyTableBundle,
  Placing,
  Race,
  RacecardSnapshot,
  Runner,
  TeamtalkNewsBundle,
  Tip,
} from "@/types";

const REL = "data/local/user-templates.json";

export type UserTemplatesFile = {
  nextOff: Record<string, NextOffBundle>;
  fastResults: Record<string, FastResultBundle>;
  racecards: Record<string, RacecardSnapshot>;
  teamtalkNews: Record<string, TeamtalkNewsBundle>;
  f1Grid: Record<string, F1GridBundle>;
  f1Results: Record<string, F1ResultsBundle>;
  planetFootballTables: Record<string, PlanetFootballTableBundle>;
  planetRugbyTables: Record<string, PlanetRugbyTableBundle>;
};

const TEAMTALK_HEADLINE_LINES = 4;

/** Ensure on-disk / legacy JSON cannot break list pages or the editor (missing silks, short arrays, etc.). */
function normalizeNextOff(b: NextOffBundle): NextOffBundle {
  const race = b.race ?? emptyRace(b.id);
  const tips = (b.tips ?? []).map((t, i) => ({
    ...t,
    race: t.race ?? race,
    silks: t.silks ?? defaultSilksForIndex(i),
  }));
  return { ...b, tips, race };
}

function normalizeFastResult(b: FastResultBundle): FastResultBundle {
  const race = b.result?.race ?? emptyRace(b.id);
  let placings: Placing[] = (b.result?.placings ?? []).map((p, i) => ({
    ...p,
    silks: p.silks ?? defaultSilksForIndex(i),
  }));
  if (placings.length === 0) {
    placings = createEmptyFastResultBundle(b.id).result.placings;
  }
  return {
    ...b,
    result: {
      ...b.result,
      race,
      winner: b.result?.winner ?? "",
      sp: b.result?.sp ?? "",
      placings,
    },
  };
}

function normalizeRacecard(s: RacecardSnapshot): RacecardSnapshot {
  const runners = (s.runners ?? []).map((r, i) => ({
    ...r,
    silks: r.silks ?? defaultSilksForIndex(i),
  }));
  const topPicks =
    s.topPicks?.length && s.topPicks.every((x) => typeof x === "string")
      ? s.topPicks
      : [runners[0]?.horse ?? "Runner 1", runners[1]?.horse ?? "Runner 2"];
  const baseRace = emptyRace(s.id);
  const race = { ...baseRace, ...(s.race ?? {}), runnersCount: runners.length || (s.race?.runnersCount ?? baseRace.runnersCount) };
  return {
    ...s,
    race,
    runners,
    topPicks,
    boardRunnersPerPage: s.boardRunnersPerPage ?? 11,
  };
}

function normalizeF1Grid(b: F1GridBundle): F1GridBundle {
  const drivers = (b.drivers ?? []).map((d, i) => ({
    ...d,
    position: typeof d.position === "number" && d.position > 0 ? d.position : i + 1,
    name: String(d.name ?? "").trim() || `DRIVER ${i + 1}`,
    time: String(d.time ?? "").trim() || "—",
    teamColor: String(d.teamColor ?? "#475569").trim() || "#475569",
    tag: d.tag?.trim() || "",
    image: typeof d.image === "string" ? d.image.trim() : "",
  }));
  return {
    ...b,
    title: (b.title ?? "STARTING GRID").trim() || "STARTING GRID",
    subtitle: (b.subtitle ?? "GRAND PRIX").trim() || "GRAND PRIX",
    rowsPerPage: Math.min(22, Math.max(1, b.rowsPerPage ?? 11)),
    drivers,
    footerBrand: (b.footerBrand ?? "PLANETF1.com").trim() || "PLANETF1.com",
    introLine: b.introLine?.trim() ?? "",
    outroLine: b.outroLine?.trim() ?? "",
  };
}

function normalizeF1Results(b: F1ResultsBundle): F1ResultsBundle {
  const drivers = (b.drivers ?? []).map((d, i) => ({
    ...d,
    position: typeof d.position === "number" && d.position > 0 ? d.position : i + 1,
    positionLabel: d.positionLabel?.trim() || undefined,
    name: String(d.name ?? "").trim() || `DRIVER ${i + 1}`,
    team: String(d.team ?? "").trim() || "",
    time: String(d.time ?? "").trim() || "—",
    stops: d.stops ?? "—",
    teamColor: String(d.teamColor ?? "#475569").trim() || "#475569",
    image: typeof d.image === "string" ? d.image.trim() : "",
  }));
  const fl = b.fastestLap ?? {
    driverName: "—",
    team: "",
    time: "—",
    stops: "—",
    teamColor: "#475569",
    image: "",
  };
  return {
    ...b,
    title: (b.title ?? "RACE RESULTS").trim() || "RACE RESULTS",
    subtitle: (b.subtitle ?? "GRAND PRIX").trim() || "GRAND PRIX",
    rowsPerPage: Math.min(22, Math.max(1, b.rowsPerPage ?? 11)),
    drivers,
    fastestLap: {
      driverName: String(fl.driverName ?? "").trim() || "—",
      team: String(fl.team ?? "").trim() || "",
      time: String(fl.time ?? "").trim() || "—",
      stops: fl.stops ?? "—",
      teamColor: String(fl.teamColor ?? "#475569").trim() || "#475569",
      image: typeof fl.image === "string" ? fl.image.trim() : "",
    },
    footerBrand: (b.footerBrand ?? "PLANETF1.com").trim() || "PLANETF1.com",
    introLine: b.introLine?.trim() ?? "",
    outroLine: b.outroLine?.trim() ?? "",
  };
}

function normalizeTeamtalk(b: TeamtalkNewsBundle): TeamtalkNewsBundle {
  const raw = [...(b.headlineLines ?? [])];
  while (raw.length < TEAMTALK_HEADLINE_LINES) raw.push("");
  const headlineLines = raw.slice(0, TEAMTALK_HEADLINE_LINES);
  return {
    ...b,
    headlineLines,
    tag: (b.tag ?? "NEWS").trim() || "NEWS",
    linkCta: (b.linkCta ?? "LINK IN FIRST COMMENT").trim() || "LINK IN FIRST COMMENT",
    outroLine: (b.outroLine ?? "Follow TEAMtalk for more.").trim() || "Follow TEAMtalk for more.",
    secondaryParagraph:
      (b.secondaryParagraph ?? "Read more on TEAMtalk.").trim() || "Read more on TEAMtalk.",
    playerName: b.playerName ?? "",
  };
}

function normalizeUserTemplatesFile(data: UserTemplatesFile): UserTemplatesFile {
  return {
    nextOff: Object.fromEntries(Object.entries(data.nextOff).map(([id, b]) => [id, normalizeNextOff(b)])),
    fastResults: Object.fromEntries(
      Object.entries(data.fastResults).map(([id, b]) => [id, normalizeFastResult(b)]),
    ),
    racecards: Object.fromEntries(Object.entries(data.racecards).map(([id, s]) => [id, normalizeRacecard(s)])),
    teamtalkNews: Object.fromEntries(
      Object.entries(data.teamtalkNews).map(([id, b]) => [id, normalizeTeamtalk(b)]),
    ),
    f1Grid: Object.fromEntries(
      Object.entries(data.f1Grid ?? {}).map(([id, b]) => [id, normalizeF1Grid(b)]),
    ),
    f1Results: Object.fromEntries(
      Object.entries((data as { f1Results?: Record<string, F1ResultsBundle> }).f1Results ?? {}).map(
        ([id, b]) => [id, normalizeF1Results(b)],
      ),
    ),
    planetFootballTables: Object.fromEntries(
      Object.entries((data as { planetFootballTables?: Record<string, PlanetFootballTableBundle> }).planetFootballTables ?? {}),
    ),
    planetRugbyTables: Object.fromEntries(
      Object.entries((data as { planetRugbyTables?: Record<string, PlanetRugbyTableBundle> }).planetRugbyTables ?? {}),
    ),
  };
}

function emptyRace(idSuffix: string): Race {
  return {
    id: `race-${idSuffix}`,
    course: "Course",
    raceTime: "2:30",
    title: "New race",
    distance: "",
    going: "",
    runnersCount: 0,
  };
}

function newTemplateId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `tpl-${t}-${r}`;
}

export { newTemplateId };

export function createEmptyNextOffBundle(id: string): NextOffBundle {
  const race = emptyRace(id);
  const tips: Tip[] = [
    { horse: "Runner 1", odds: "3/1", stars: 3, race, silks: defaultSilksForIndex(0) },
    { horse: "Runner 2", odds: "4/1", stars: 2, race, silks: defaultSilksForIndex(1) },
    { horse: "Runner 3", odds: "5/1", stars: 2, race, silks: defaultSilksForIndex(2) },
  ];
  return { id, race, tips };
}

export function createEmptyFastResultBundle(id: string): FastResultBundle {
  const race = emptyRace(id);
  const placings: Placing[] = [
    { position: 1, horse: "", sp: "", silks: defaultSilksForIndex(0) },
    { position: 2, horse: "", sp: "", silks: defaultSilksForIndex(1) },
    { position: 3, horse: "", sp: "", silks: defaultSilksForIndex(2) },
    { position: 4, horse: "", sp: "", silks: defaultSilksForIndex(3) },
  ];
  return {
    id,
    result: { race, winner: "", sp: "", placings },
  };
}

export function createEmptyTeamtalkNewsBundle(id: string): TeamtalkNewsBundle {
  return {
    id,
    tag: "EXCLUSIVE",
    headlineLines: [
      "MAN UTD, ARSENAL TO JOIN MAN CITY IN",
      "MAKING 'FORMAL APPROACHES' FOR",
      "CHAMPIONSHIP WONDERKID - EXCLUSIVE",
      "",
    ],
    playerName: "",
    secondaryParagraph:
      "Sources say elite clubs are lining up formal interest in the breakout Championship talent.",
    linkCta: "LINK IN FIRST COMMENT",
    outroLine: "Follow TEAMtalk for more transfer exclusives.",
    aiVoiceStyle: "Journalist",
  };
}

export function createEmptyF1GridBundle(id: string): F1GridBundle {
  return {
    id,
    title: "STARTING GRID",
    subtitle: "JAPANESE GP",
    rowsPerPage: 11,
    footerBrand: "PLANETF1.com",
    introLine: "Qualifying — starting grid",
    outroLine: "Lights out — follow every session on PLANETF1.com",
    drivers: [
      { position: 1, name: "ANTONELLI", time: "1:28.778", teamColor: "#00D2BE" },
      { position: 2, name: "RUSSELL", time: "1:29.076", teamColor: "#00D2BE" },
      { position: 3, name: "PIASTRI", time: "1:29.132", teamColor: "#FF8700" },
    ],
  };
}

export function createEmptyF1ResultsBundle(id: string): F1ResultsBundle {
  return {
    id,
    title: "RACE RESULTS",
    subtitle: "JAPANESE GP",
    rowsPerPage: 11,
    footerBrand: "PLANETF1.com",
    introLine: "Race classification — full results.",
    outroLine: "Fastest lap and full times — follow every session on PLANETF1.com",
    drivers: [
      {
        position: 1,
        name: "KIMI ANTONELLI",
        team: "Mercedes",
        time: "1:32.432",
        stops: 1,
        teamColor: "#00D2BE",
      },
      {
        position: 2,
        name: "OSCAR PIASTRI",
        team: "McLaren",
        time: "+ 13.722",
        stops: 1,
        teamColor: "#FF8700",
      },
    ],
    fastestLap: {
      driverName: "KIMI ANTONELLI",
      team: "Mercedes",
      time: "1:32.432",
      stops: 1,
      teamColor: "#00D2BE",
    },
  };
}

export function createEmptyRacecardSnapshot(id: string): RacecardSnapshot {
  const race = emptyRace(id);
  const runners: Runner[] = [1, 2, 3, 4, 5].map((n, i) => ({
    number: n,
    horse: `Runner ${n}`,
    odds: `${4 + i}/1`,
    silks: defaultSilksForIndex(i),
  }));
  return {
    id,
    race: { ...race, runnersCount: runners.length },
    runners,
    topPicks: [runners[0]!.horse, runners[1]!.horse],
    boardRunnersPerPage: 11,
  };
}

export function createEmptyPlanetRugbyTableBundle(id: string): PlanetRugbyTableBundle {
  return {
    id,
    table: {
      source: "Planet Rugby",
      sourceUrl: "",
      competition: "Premiership",
      updatedAt: "",
      columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
      rows: [
        {
          position: 1,
          team: "Northampton Saints",
          played: 13,
          won: 11,
          drawn: 1,
          lost: 1,
          pointsDifference: "+120",
          points: 57,
        },
        {
          position: 2,
          team: "Bath",
          played: 13,
          won: 11,
          drawn: 0,
          lost: 2,
          pointsDifference: "+191",
          points: 56,
        },
      ],
    },
    introLine: "Premiership latest table",
    headline: "Latest Table",
    subtitle: "",
    outroLine: "For more rugby coverage, head to PlanetRugby.com",
    showLogo: true,
    showTeamLogos: true,
    tableStyle: "standard-image-overlay",
    tableMode: "full-table",
    playoffRows: 4,
    bottomRows: 4,
    highlightColor: "#f5c542",
    fontSize: 1,
    rowSpacing: 1,
    tablePosition: "lower-left",
    tableWidthPercent: 94,
    tableHeightPercent: 72,
    tableBackgroundStyle: "balanced",
    tablePanelOpacity: 0.58,
    backgroundBlur: 0,
    overlayStrength: 0.55,
    introDurationSec: 2.2,
    mainDurationSec: 4.6,
    secondDurationSec: 4.6,
    outroDurationSec: 2.2,
    voiceoverEnabled: false,
  };
}

export function createEmptyPlanetFootballTableBundle(id: string): PlanetFootballTableBundle {
  return {
    ...createEmptyPlanetRugbyTableBundle(id),
    table: {
      source: "Sport365",
      sourceUrl: "https://www.sport365.com/football/england/premier-league#/standings",
      competition: "Premier League",
      updatedAt: "",
      columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
      rows: [
        { position: 1, team: "Liverpool", played: 10, won: 8, drawn: 1, lost: 1, pointsDifference: "+15", points: 25 },
        { position: 2, team: "Arsenal", played: 10, won: 7, drawn: 2, lost: 1, pointsDifference: "+12", points: 23 },
      ],
    },
    introLine: "Premier League latest table",
    headline: "Latest Table",
    outroLine: "For more football coverage, head to Sport365.com",
    showTeamLogos: false,
    highlightColor: "#38bdf8",
  };
}

export async function readUserTemplatesFile(): Promise<UserTemplatesFile> {
  const full = path.join(process.cwd(), REL);
  try {
    const fileText = await fs.readFile(full, "utf-8");
    const p = JSON.parse(fileText) as unknown;
    if (!p || typeof p !== "object") throw new Error("bad shape");
    const o = p as Record<string, unknown>;
    const parsed: UserTemplatesFile = {
      nextOff: (o.nextOff as Record<string, NextOffBundle>) ?? {},
      fastResults: (o.fastResults as Record<string, FastResultBundle>) ?? {},
      racecards: (o.racecards as Record<string, RacecardSnapshot>) ?? {},
      teamtalkNews: (o.teamtalkNews as Record<string, TeamtalkNewsBundle>) ?? {},
      f1Grid: (o.f1Grid as Record<string, F1GridBundle>) ?? {},
      f1Results: (o.f1Results as Record<string, F1ResultsBundle>) ?? {},
      planetFootballTables: (o.planetFootballTables as Record<string, PlanetFootballTableBundle>) ?? {},
      planetRugbyTables: (o.planetRugbyTables as Record<string, PlanetRugbyTableBundle>) ?? {},
    };
    return normalizeUserTemplatesFile(parsed);
  } catch {
    return {
      nextOff: {},
      fastResults: {},
      racecards: {},
      teamtalkNews: {},
      f1Grid: {},
      f1Results: {},
      planetFootballTables: {},
      planetRugbyTables: {},
    };
  }
}

export async function writeUserTemplatesFile(data: UserTemplatesFile): Promise<void> {
  const full = path.join(process.cwd(), REL);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf-8");
}

export async function upsertUserNextOff(bundle: NextOffBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.nextOff[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserFastResult(bundle: FastResultBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.fastResults[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserRacecard(snap: RacecardSnapshot): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.racecards[snap.id] = snap;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserTeamtalkNews(bundle: TeamtalkNewsBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.teamtalkNews[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserF1Grid(bundle: F1GridBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.f1Grid[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserF1Results(bundle: F1ResultsBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.f1Results[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserPlanetRugbyTable(bundle: PlanetRugbyTableBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.planetRugbyTables[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function upsertUserPlanetFootballTable(bundle: PlanetFootballTableBundle): Promise<void> {
  const cur = await readUserTemplatesFile();
  cur.planetFootballTables[bundle.id] = bundle;
  await writeUserTemplatesFile(cur);
}

export async function deleteUserTemplate(
  format:
    | "next-off"
    | "fast-results"
    | "racecard"
    | "teamtalk-news"
    | "f1-grid"
    | "f1-results"
    | "planet-football-table"
    | "planet-rugby-table",
  id: string,
): Promise<boolean> {
  const cur = await readUserTemplatesFile();
  let hit = false;
  if (format === "next-off" && cur.nextOff[id]) {
    delete cur.nextOff[id];
    hit = true;
  }
  if (format === "fast-results" && cur.fastResults[id]) {
    delete cur.fastResults[id];
    hit = true;
  }
  if (format === "racecard" && cur.racecards[id]) {
    delete cur.racecards[id];
    hit = true;
  }
  if (format === "teamtalk-news" && cur.teamtalkNews[id]) {
    delete cur.teamtalkNews[id];
    hit = true;
  }
  if (format === "f1-grid" && cur.f1Grid[id]) {
    delete cur.f1Grid[id];
    hit = true;
  }
  if (format === "f1-results" && cur.f1Results[id]) {
    delete cur.f1Results[id];
    hit = true;
  }
  if (format === "planet-rugby-table" && cur.planetRugbyTables[id]) {
    delete cur.planetRugbyTables[id];
    hit = true;
  }
  if (format === "planet-football-table" && cur.planetFootballTables[id]) {
    delete cur.planetFootballTables[id];
    hit = true;
  }
  if (hit) await writeUserTemplatesFile(cur);
  return hit;
}
