export type OptaPlayerSummaryStats = {
  rating?: number;
  goals?: number;
  assists?: number;
  minutes?: number;
};

export type OptaPlayerOffensiveStats = {
  shots?: number;
  xG?: number;
  xA?: number;
  keyPasses?: number;
  dribbles?: number;
};

export type OptaPlayerDefensiveStats = {
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  duelsWon?: number;
  cards?: number;
};

export type OptaPlayerPassingStats = {
  passes?: number;
  passAccuracy?: number;
  longBalls?: number;
  crosses?: number;
  throughBalls?: number;
};

export type OptaPlayerProfile = {
  name: string;
  team: "home" | "away";
  teamName: string;
  position?: string;
  shirtNumber?: number;
  minutes?: number;
  isSubstitute?: boolean;
  isManOfTheMatch?: boolean;
  summary: OptaPlayerSummaryStats;
  offensive: OptaPlayerOffensiveStats;
  defensive: OptaPlayerDefensiveStats;
  passing: OptaPlayerPassingStats;
  statSummary?: string;
};

export type OptaPlayerIntelligence = {
  sourceProvider: "whoscored" | "opta_api";
  sourceUrl: string;
  externalMatchId?: string;
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  score?: string;
  manOfTheMatch?: { name: string; rating?: number };
  players: OptaPlayerProfile[];
  summaryDigest: string;
  partialParse?: boolean;
  importedAt: string;
};
