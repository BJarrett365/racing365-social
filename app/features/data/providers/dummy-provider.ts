import { readFile } from "fs/promises";
import path from "path";
import type {
  Tip,
  NextOffBundle,
  FastResultBundle,
  RacecardSnapshot,
  FootballLineupBundle,
  TeamtalkNewsBundle,
  F1GridBundle,
  F1ResultsBundle,
  PlanetFootballTableBundle,
  PlanetRugbyTableBundle,
  TeamLineUpBundle,
  TeamSheetBundle,
  ScoreLineBundle,
} from "@/types";
import type { RacingDataProvider } from "./types";
import { readUserTemplatesFile } from "@/app/lib/user-templates-store";

type RawNextOff = Omit<NextOffBundle, "tips"> & {
  tips: Omit<Tip, "race">[];
};

export class DummyRacingDataProvider implements RacingDataProvider {
  private root = process.cwd();

  private async readJson<T>(rel: string): Promise<T> {
    const full = path.join(this.root, rel);
    const raw = await readFile(full, "utf-8");
    return JSON.parse(raw) as T;
  }

  /**
   * Dummy seed JSON may be absent on serverless deploys (smaller artifact / path differences).
   * Never throw — list pages must render with user templates + empty seed data.
   */
  private async readJsonOptional<T>(rel: string): Promise<T | null> {
    try {
      return await this.readJson<T>(rel);
    } catch {
      return null;
    }
  }

  async getNextOffBundles(): Promise<NextOffBundle[]> {
    const rows = (await this.readJsonOptional<RawNextOff[]>("data/dummy/next-off-tips.json")) ?? [];
    const dummy = rows.map((row) => ({
      ...row,
      tips: row.tips.map((t) => ({ ...t, race: row.race })),
    }));
    const u = await readUserTemplatesFile();
    const user = Object.values(u.nextOff).map((row) => ({
      ...row,
      tips: row.tips.map((t) => ({ ...t, race: row.race })),
    }));
    return [...user, ...dummy];
  }

  async getFastResults(): Promise<FastResultBundle[]> {
    const dummy = (await this.readJsonOptional<FastResultBundle[]>("data/dummy/fast-results.json")) ?? [];
    const u = await readUserTemplatesFile();
    const user = Object.values(u.fastResults);
    return [...user, ...dummy];
  }

  async getRacecardSnapshots(): Promise<RacecardSnapshot[]> {
    const cards = (await this.readJsonOptional<RacecardSnapshot[]>("data/dummy/racecards.json")) ?? [];
    const idList = (await this.readJsonOptional<string[]>("data/dummy/racecard-snapshots.json")) ?? [];
    const ids = new Set(idList);
    const dummyFiltered = cards.filter((c) => ids.has(c.id));
    const u = await readUserTemplatesFile();
    const user = Object.values(u.racecards);
    return [...user, ...dummyFiltered];
  }

  async getFootballLineups(): Promise<FootballLineupBundle[]> {
    const u = await readUserTemplatesFile();
    const user = Object.values(u.footballLineups);
    const dummy =
      (await this.readJsonOptional<FootballLineupBundle[]>("data/dummy/football-lineups.json")) ?? [];
    return [...user, ...dummy];
  }

  async getTeamtalkNewsBundles(): Promise<TeamtalkNewsBundle[]> {
    const u = await readUserTemplatesFile();
    const user = Object.values(u.teamtalkNews);
    try {
      const dummy = await this.readJson<TeamtalkNewsBundle[]>("data/dummy/teamtalk-news.json");
      return [...user, ...dummy];
    } catch {
      return user;
    }
  }

  async getF1GridBundles(): Promise<F1GridBundle[]> {
    const u = await readUserTemplatesFile();
    const user = Object.values(u.f1Grid);
    try {
      const dummy = await this.readJson<F1GridBundle[]>("data/dummy/f1-grid.json");
      return [...user, ...dummy];
    } catch {
      return user;
    }
  }

  async getF1ResultsBundles(): Promise<F1ResultsBundle[]> {
    const u = await readUserTemplatesFile();
    const user = Object.values(u.f1Results);
    try {
      const dummy = await this.readJson<F1ResultsBundle[]>("data/dummy/f1-results.json");
      return [...user, ...dummy];
    } catch {
      return user;
    }
  }

  async getPlanetRugbyTableBundles(): Promise<PlanetRugbyTableBundle[]> {
    const u = await readUserTemplatesFile();
    return Object.values(u.planetRugbyTables);
  }

  async getPlanetFootballTableBundles(): Promise<PlanetFootballTableBundle[]> {
    const u = await readUserTemplatesFile();
    return Object.values(u.planetFootballTables);
  }

  async getTeamLineUpBundles(): Promise<TeamLineUpBundle[]> {
    const u = await readUserTemplatesFile();
    return Object.values(u.teamLineUps);
  }

  async getTeamSheetBundles(): Promise<TeamSheetBundle[]> {
    const u = await readUserTemplatesFile();
    return Object.values(u.teamSheets);
  }

  async getScoreLineBundles(): Promise<ScoreLineBundle[]> {
    const u = await readUserTemplatesFile();
    return Object.values(u.scoreLines);
  }

  async getNextOffById(id: string): Promise<NextOffBundle | null> {
    const u = await readUserTemplatesFile();
    const row = u.nextOff[id];
    if (row) {
      return {
        ...row,
        tips: row.tips.map((t) => ({ ...t, race: row.race })),
      };
    }
    const rows = (await this.readJsonOptional<RawNextOff[]>("data/dummy/next-off-tips.json")) ?? [];
    const hit = rows.find((b) => b.id === id);
    if (!hit) return null;
    return {
      ...hit,
      tips: hit.tips.map((t) => ({ ...t, race: hit.race })),
    };
  }

  async getFastResultById(id: string): Promise<FastResultBundle | null> {
    const u = await readUserTemplatesFile();
    if (u.fastResults[id]) return u.fastResults[id];
    const all = (await this.readJsonOptional<FastResultBundle[]>("data/dummy/fast-results.json")) ?? [];
    return all.find((b) => b.id === id) ?? null;
  }

  async getRacecardById(id: string): Promise<RacecardSnapshot | null> {
    const u = await readUserTemplatesFile();
    if (u.racecards[id]) return u.racecards[id];
    const all = (await this.readJsonOptional<RacecardSnapshot[]>("data/dummy/racecards.json")) ?? [];
    return all.find((c) => c.id === id) ?? null;
  }

  async getFootballLineupById(id: string): Promise<FootballLineupBundle | null> {
    const u = await readUserTemplatesFile();
    if (u.footballLineups[id]) return u.footballLineups[id];
    const all = (await this.readJsonOptional<FootballLineupBundle[]>("data/dummy/football-lineups.json")) ?? [];
    return all.find((b) => b.id === id) ?? null;
  }

  async getTeamtalkNewsById(id: string): Promise<TeamtalkNewsBundle | null> {
    const u = await readUserTemplatesFile();
    if (u.teamtalkNews[id]) return u.teamtalkNews[id];
    try {
      const dummy = await this.readJson<TeamtalkNewsBundle[]>("data/dummy/teamtalk-news.json");
      return dummy.find((b) => b.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async getF1GridById(id: string): Promise<F1GridBundle | null> {
    const u = await readUserTemplatesFile();
    if (u.f1Grid[id]) return u.f1Grid[id];
    try {
      const dummy = await this.readJson<F1GridBundle[]>("data/dummy/f1-grid.json");
      return dummy.find((b) => b.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async getF1ResultsById(id: string): Promise<F1ResultsBundle | null> {
    const u = await readUserTemplatesFile();
    if (u.f1Results[id]) return u.f1Results[id];
    try {
      const dummy = await this.readJson<F1ResultsBundle[]>("data/dummy/f1-results.json");
      return dummy.find((b) => b.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async getPlanetRugbyTableById(id: string): Promise<PlanetRugbyTableBundle | null> {
    const u = await readUserTemplatesFile();
    return u.planetRugbyTables[id] ?? null;
  }

  async getPlanetFootballTableById(id: string): Promise<PlanetFootballTableBundle | null> {
    const u = await readUserTemplatesFile();
    return u.planetFootballTables[id] ?? null;
  }

  async getTeamLineUpById(id: string): Promise<TeamLineUpBundle | null> {
    const u = await readUserTemplatesFile();
    return u.teamLineUps[id] ?? null;
  }

  async getTeamSheetById(id: string): Promise<TeamSheetBundle | null> {
    const u = await readUserTemplatesFile();
    return u.teamSheets[id] ?? null;
  }

  async getScoreLineById(id: string): Promise<ScoreLineBundle | null> {
    const u = await readUserTemplatesFile();
    return u.scoreLines[id] ?? null;
  }
}
