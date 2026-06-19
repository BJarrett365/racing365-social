import { NextResponse } from "next/server";
import {
  createEmptyF1GridBundle,
  createEmptyF1ResultsBundle,
  createEmptyFastResultBundle,
  createEmptyNextOffBundle,
  createEmptyPlanetFootballTableBundle,
  createEmptyPlanetRugbyTableBundle,
  createEmptyTeamLineUpBundle,
  createEmptyTeamSheetBundle,
  createEmptyScoreLineBundle,
  createEmptyRacecardSnapshot,
  createEmptyTeamtalkNewsBundle,
  deleteUserTemplate,
  newTemplateId,
  upsertUserF1Grid,
  upsertUserF1Results,
  upsertUserFastResult,
  upsertUserNextOff,
  upsertUserPlanetFootballTable,
  upsertUserPlanetRugbyTable,
  upsertUserTeamLineUp,
  upsertUserTeamSheet,
  upsertUserScoreLine,
  upsertUserFootballLineup,
  upsertUserRacecard,
  upsertUserTeamtalkNews,
} from "@/app/lib/user-templates-store";
import type {
  F1GridBundle,
  F1ResultsBundle,
  FastResultBundle,
  NextOffBundle,
  PlanetFootballTableBundle,
  PlanetRugbyTableBundle,
  RacecardSnapshot,
  FootballLineupBundle,
  TeamLineUpBundle,
  TeamSheetBundle,
  ScoreLineBundle,
  TeamtalkNewsBundle,
} from "@/types";

type PutBody =
  | { format: "next-off"; nextOff: NextOffBundle }
  | { format: "fast-results"; fastResults: FastResultBundle }
  | { format: "racecard"; racecard: RacecardSnapshot }
  | { format: "teamtalk-news"; teamtalkNews: TeamtalkNewsBundle }
  | { format: "f1-grid"; f1Grid: F1GridBundle }
  | { format: "f1-results"; f1Results: F1ResultsBundle }
  | { format: "planet-football-table"; planetFootballTable: PlanetFootballTableBundle }
  | { format: "planet-rugby-table"; planetRugbyTable: PlanetRugbyTableBundle }
  | { format: "team-line-up"; teamLineUp: TeamLineUpBundle }
  | { format: "team-sheet"; teamSheet: TeamSheetBundle }
  | { format: "score-line"; scoreLine: ScoreLineBundle }
  | { format: "football-lineups"; footballLineup: FootballLineupBundle };

function isUserTemplateId(id: string): boolean {
  return id.startsWith("tpl-");
}

/** Create a new empty user template (stored under data/local/user-templates.json). */
export async function POST(req: Request) {
  let body: { format?: string };
  try {
    body = (await req.json()) as { format?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const format = body.format;
  if (
    format !== "next-off" &&
    format !== "fast-results" &&
    format !== "racecard" &&
    format !== "teamtalk-news" &&
    format !== "f1-grid" &&
    format !== "f1-results" &&
    format !== "planet-football-table" &&
    format !== "planet-rugby-table" &&
    format !== "team-line-up" &&
    format !== "team-sheet" &&
    format !== "score-line"
  ) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  try {
    const id = newTemplateId();
    if (format === "next-off") {
      const bundle = createEmptyNextOffBundle(id);
      await upsertUserNextOff(bundle);
      return NextResponse.json({ id, editorPath: `/editor/next-off/${id}` });
    }
    if (format === "fast-results") {
      const bundle = createEmptyFastResultBundle(id);
      await upsertUserFastResult(bundle);
      return NextResponse.json({ id, editorPath: `/editor/fast-results/${id}` });
    }
    if (format === "racecard") {
      const snap = createEmptyRacecardSnapshot(id);
      await upsertUserRacecard(snap);
      return NextResponse.json({ id, editorPath: `/editor/racecard/${id}` });
    }
    if (format === "f1-grid") {
      const g = createEmptyF1GridBundle(id);
      await upsertUserF1Grid(g);
      return NextResponse.json({ id, editorPath: `/editor/f1-grid/${id}` });
    }
    if (format === "f1-results") {
      const g = createEmptyF1ResultsBundle(id);
      await upsertUserF1Results(g);
      return NextResponse.json({ id, editorPath: `/editor/f1-results/${id}` });
    }
    if (format === "planet-rugby-table") {
      const bundle = createEmptyPlanetRugbyTableBundle(id);
      await upsertUserPlanetRugbyTable(bundle);
      return NextResponse.json({ id, editorPath: `/editor/planet-rugby-table/${id}` });
    }
    if (format === "planet-football-table") {
      const bundle = createEmptyPlanetFootballTableBundle(id);
      await upsertUserPlanetFootballTable(bundle);
      return NextResponse.json({ id, editorPath: `/editor/planet-football-table/${id}` });
    }
    if (format === "team-line-up") {
      const bundle = createEmptyTeamLineUpBundle(id);
      await upsertUserTeamLineUp(bundle);
      return NextResponse.json({ id, editorPath: `/editor/team-line-up/${id}` });
    }
    if (format === "team-sheet") {
      const bundle = createEmptyTeamSheetBundle(id);
      await upsertUserTeamSheet(bundle);
      return NextResponse.json({ id, editorPath: `/editor/team-sheet/${id}` });
    }
    if (format === "score-line") {
      const bundle = createEmptyScoreLineBundle(id);
      await upsertUserScoreLine(bundle);
      return NextResponse.json({ id, editorPath: `/editor/score-line/${id}` });
    }
    const tt = createEmptyTeamtalkNewsBundle(id);
    await upsertUserTeamtalkNews(tt);
    return NextResponse.json({ id, editorPath: `/editor/teamtalk-news/${id}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Upsert a user template (same id replaces on disk). */
export async function PUT(req: Request) {
  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.format === "next-off") {
      const b = body.nextOff;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid next-off bundle or id" }, { status: 400 });
      }
      await upsertUserNextOff(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "fast-results") {
      const b = body.fastResults;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid fast-results bundle or id" }, { status: 400 });
      }
      await upsertUserFastResult(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "racecard") {
      const s = body.racecard;
      if (!s?.id || !isUserTemplateId(s.id)) {
        return NextResponse.json({ error: "Invalid racecard snapshot or id" }, { status: 400 });
      }
      await upsertUserRacecard(s);
      return NextResponse.json({ ok: true, id: s.id });
    }
    if (body.format === "teamtalk-news") {
      const b = body.teamtalkNews;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid TEAMtalk News bundle or id" }, { status: 400 });
      }
      await upsertUserTeamtalkNews(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "f1-grid") {
      const b = body.f1Grid;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid F1 Grid bundle or id" }, { status: 400 });
      }
      await upsertUserF1Grid(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "f1-results") {
      const b = body.f1Results;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid F1 Results bundle or id" }, { status: 400 });
      }
      await upsertUserF1Results(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "planet-rugby-table") {
      const b = body.planetRugbyTable;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid Planet Rugby table bundle or id" }, { status: 400 });
      }
      await upsertUserPlanetRugbyTable(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "planet-football-table") {
      const b = body.planetFootballTable;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid Planet Football table bundle or id" }, { status: 400 });
      }
      await upsertUserPlanetFootballTable(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "team-line-up") {
      const b = body.teamLineUp;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid Team Line-Up bundle or id" }, { status: 400 });
      }
      await upsertUserTeamLineUp(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "team-sheet") {
      const b = body.teamSheet;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid Team Sheet bundle or id" }, { status: 400 });
      }
      await upsertUserTeamSheet(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "score-line") {
      const b = body.scoreLine;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid Score Line bundle or id" }, { status: 400 });
      }
      await upsertUserScoreLine(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    if (body.format === "football-lineups") {
      const b = body.footballLineup;
      if (!b?.id || !isUserTemplateId(b.id)) {
        return NextResponse.json({ error: "Invalid Football line-ups bundle or id" }, { status: 400 });
      }
      await upsertUserFootballLineup(b);
      return NextResponse.json({ ok: true, id: b.id });
    }
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Remove a user template by id (tpl-* only). */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const id = searchParams.get("id")?.trim();
  if (!id || !isUserTemplateId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (
    format !== "next-off" &&
    format !== "fast-results" &&
    format !== "racecard" &&
    format !== "teamtalk-news" &&
    format !== "f1-grid" &&
    format !== "f1-results" &&
    format !== "planet-football-table" &&
    format !== "planet-rugby-table" &&
    format !== "team-line-up" &&
    format !== "team-sheet" &&
    format !== "score-line" &&
    format !== "football-lineups"
  ) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }
  try {
    const ok = await deleteUserTemplate(format, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
