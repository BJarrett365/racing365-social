export type PlanetSportBrandId =
  | "planetf1"
  | "football365"
  | "planet_rugby"
  | "tennis365"
  | "planet_football"
  | "cricket365"
  | "teamtalk"
  | "golf365"
  | "love_rugby_league"
  | "grassroot_goals"
  | "racing365"
  | "sport365";

export type PlanetSportBrand = {
  id: PlanetSportBrandId;
  displayName: string;
  domain?: string;
  primarySport: string;
  editorialRulesId?: string;
  knowledgeFileId?: string;
  /** Match report target slug when applicable */
  matchReportTarget?: "football365" | "teamtalk" | "planet-football" | "sport365";
};

export const PLANET_SPORT_BRANDS: readonly PlanetSportBrand[] = [
  { id: "planetf1", displayName: "PlanetF1.com", domain: "planetf1.com", primarySport: "Formula 1", editorialRulesId: "planetf1", knowledgeFileId: "seed-knowledge-planetf1-brand-style" },
  { id: "football365", displayName: "Football365", domain: "football365.com", primarySport: "Football", editorialRulesId: "football365", knowledgeFileId: "seed-knowledge-football365-brand-style", matchReportTarget: "football365" },
  { id: "planet_rugby", displayName: "Planet Rugby", domain: "planetrugby.com", primarySport: "Rugby Union", editorialRulesId: "planet_rugby", knowledgeFileId: "seed-knowledge-planet-rugby-brand-style" },
  { id: "tennis365", displayName: "Tennis365", domain: "tennis365.com", primarySport: "Tennis", editorialRulesId: "tennis365", knowledgeFileId: "seed-knowledge-tennis365-brand-style" },
  { id: "planet_football", displayName: "Planet Football", domain: "planetfootball.com", primarySport: "Football", editorialRulesId: "planet_football", knowledgeFileId: "seed-knowledge-planet-football-brand-style", matchReportTarget: "planet-football" },
  { id: "cricket365", displayName: "Cricket365", domain: "cricket365.com", primarySport: "Cricket", editorialRulesId: "cricket365", knowledgeFileId: "seed-knowledge-cricket365-brand-style" },
  { id: "teamtalk", displayName: "TEAMtalk", domain: "teamtalk.com", primarySport: "Football", editorialRulesId: "teamtalk", knowledgeFileId: "seed-knowledge-teamtalk-brand-style", matchReportTarget: "teamtalk" },
  { id: "golf365", displayName: "Golf365", domain: "golf365.com", primarySport: "Golf", editorialRulesId: "golf365", knowledgeFileId: "seed-knowledge-golf365-brand-style" },
  { id: "love_rugby_league", displayName: "Love Rugby League", domain: "loverugbyleague.com", primarySport: "Rugby League", editorialRulesId: "love_rugby_league", knowledgeFileId: "seed-knowledge-love-rugby-league-brand-style" },
  { id: "grassroot_goals", displayName: "Grassroot Goals", domain: "grassrootgoals.com", primarySport: "Football", editorialRulesId: "grassroot_goals", knowledgeFileId: "seed-knowledge-grassroot-goals-brand-style" },
  { id: "racing365", displayName: "Racing365", domain: "racing365.com", primarySport: "Horse Racing", editorialRulesId: "racing365", knowledgeFileId: "seed-knowledge-racing365-brand-style" },
  { id: "sport365", displayName: "Sport365", domain: "sport365.com", primarySport: "Multi-sport", editorialRulesId: "sport365", knowledgeFileId: "seed-knowledge-sport365-brand-style", matchReportTarget: "sport365" },
];

const FOOTBALL_SCHEDULE_IDS = new Set<PlanetSportBrandId>([
  "football365",
  "teamtalk",
  "planet_football",
  "sport365",
  "grassroot_goals",
]);

export function planetSportBrandById(id: PlanetSportBrandId): PlanetSportBrand | undefined {
  return PLANET_SPORT_BRANDS.find((b) => b.id === id);
}

export function planetSportBrandOptions(): { value: string; label: string }[] {
  return PLANET_SPORT_BRANDS.map((b) => ({ value: b.displayName, label: b.displayName }));
}

export function footballScheduleBrands(): PlanetSportBrand[] {
  return PLANET_SPORT_BRANDS.filter((b) => FOOTBALL_SCHEDULE_IDS.has(b.id));
}

export function footballScheduleBrandDisplayNames(): string[] {
  return footballScheduleBrands().map((b) => b.displayName);
}
