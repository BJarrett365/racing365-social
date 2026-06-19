import type {
  F1GridBundle,
  F1ResultsBundle,
  FastResultBundle,
  FootballLineupBundle,
  NextOffBundle,
  PlanetFootballTableBundle,
  PlanetRugbyTableBundle,
  RacecardSnapshot,
  TeamLineUpBundle,
  TeamSheetBundle,
  ScoreLineBundle,
  TeamtalkNewsBundle,
} from "@/types";

export interface RacingDataProvider {
  getNextOffBundles(): Promise<NextOffBundle[]>;
  getFastResults(): Promise<FastResultBundle[]>;
  getRacecardSnapshots(): Promise<RacecardSnapshot[]>;
  getFootballLineups(): Promise<FootballLineupBundle[]>;
  getTeamLineUpBundles(): Promise<TeamLineUpBundle[]>;
  getTeamSheetBundles(): Promise<TeamSheetBundle[]>;
  getScoreLineBundles(): Promise<ScoreLineBundle[]>;
  getTeamtalkNewsBundles(): Promise<TeamtalkNewsBundle[]>;
  getF1GridBundles(): Promise<F1GridBundle[]>;
  getF1ResultsBundles(): Promise<F1ResultsBundle[]>;
  getPlanetFootballTableBundles(): Promise<PlanetFootballTableBundle[]>;
  getPlanetRugbyTableBundles(): Promise<PlanetRugbyTableBundle[]>;
  getNextOffById(id: string): Promise<NextOffBundle | null>;
  getFastResultById(id: string): Promise<FastResultBundle | null>;
  getRacecardById(id: string): Promise<RacecardSnapshot | null>;
  getFootballLineupById(id: string): Promise<FootballLineupBundle | null>;
  getTeamLineUpById(id: string): Promise<TeamLineUpBundle | null>;
  getTeamSheetById(id: string): Promise<TeamSheetBundle | null>;
  getScoreLineById(id: string): Promise<ScoreLineBundle | null>;
  getTeamtalkNewsById(id: string): Promise<TeamtalkNewsBundle | null>;
  getF1GridById(id: string): Promise<F1GridBundle | null>;
  getF1ResultsById(id: string): Promise<F1ResultsBundle | null>;
  getPlanetFootballTableById(id: string): Promise<PlanetFootballTableBundle | null>;
  getPlanetRugbyTableById(id: string): Promise<PlanetRugbyTableBundle | null>;
}
