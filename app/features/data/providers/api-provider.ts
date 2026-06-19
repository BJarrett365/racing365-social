import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  F1GridBundle,
  F1ResultsBundle,
  FastResultBundle,
  FootballLineupBundle,
  NextOffBundle,
  PlanetFootballTableBundle,
  RacecardSnapshot,
  TeamLineUpBundle,
  TeamtalkNewsBundle,
  PlanetRugbyTableBundle,
} from "@/types";
import type { RacingDataProvider } from "./types";

/**
 * Placeholder for live data: wire Supabase tables or edge functions
 * without changing consumers of RacingDataProvider.
 */
export class ApiRacingDataProvider implements RacingDataProvider {
  constructor(private client: SupabaseClient) {}

  static fromEnv(): ApiRacingDataProvider {
    const url = process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_ANON_KEY ?? "";
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY required for ApiRacingDataProvider");
    }
    return new ApiRacingDataProvider(createClient(url, key));
  }

  async getNextOffBundles(): Promise<NextOffBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getNextOffBundles not implemented — swap when live API is ready");
  }

  async getFastResults(): Promise<FastResultBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getFastResults not implemented");
  }

  async getRacecardSnapshots(): Promise<RacecardSnapshot[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getRacecardSnapshots not implemented");
  }

  async getFootballLineups(): Promise<FootballLineupBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getFootballLineups not implemented");
  }

  async getTeamLineUpBundles(): Promise<TeamLineUpBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getTeamLineUpBundles not implemented");
  }

  async getTeamSheetBundles(): Promise<import("@/types").TeamSheetBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getTeamSheetBundles not implemented");
  }

  async getScoreLineBundles(): Promise<import("@/types").ScoreLineBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getScoreLineBundles not implemented");
  }

  async getTeamtalkNewsBundles(): Promise<TeamtalkNewsBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getTeamtalkNewsBundles not implemented");
  }

  async getF1GridBundles(): Promise<F1GridBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getF1GridBundles not implemented");
  }

  async getF1ResultsBundles(): Promise<F1ResultsBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getF1ResultsBundles not implemented");
  }

  async getPlanetRugbyTableBundles(): Promise<PlanetRugbyTableBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getPlanetRugbyTableBundles not implemented");
  }

  async getPlanetFootballTableBundles(): Promise<PlanetFootballTableBundle[]> {
    void this.client;
    throw new Error("ApiRacingDataProvider.getPlanetFootballTableBundles not implemented");
  }

  async getNextOffById(): Promise<NextOffBundle | null> {
    return null;
  }

  async getFastResultById(): Promise<FastResultBundle | null> {
    return null;
  }

  async getRacecardById(): Promise<RacecardSnapshot | null> {
    return null;
  }

  async getFootballLineupById(): Promise<FootballLineupBundle | null> {
    return null;
  }

  async getTeamLineUpById(): Promise<TeamLineUpBundle | null> {
    return null;
  }

  async getTeamSheetById(): Promise<import("@/types").TeamSheetBundle | null> {
    return null;
  }

  async getScoreLineById(): Promise<import("@/types").ScoreLineBundle | null> {
    return null;
  }

  async getTeamtalkNewsById(): Promise<TeamtalkNewsBundle | null> {
    return null;
  }

  async getF1GridById(): Promise<F1GridBundle | null> {
    return null;
  }

  async getF1ResultsById(): Promise<F1ResultsBundle | null> {
    return null;
  }

  async getPlanetRugbyTableById(): Promise<PlanetRugbyTableBundle | null> {
    return null;
  }

  async getPlanetFootballTableById(): Promise<PlanetFootballTableBundle | null> {
    return null;
  }
}
