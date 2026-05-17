const PRESETS_STORAGE_KEY = "data-studio-fixture-presets";

export type FixturePreset = {
  id: string;
  label: string;
  sport_id: string;
  match_id: string;
  /** Optional Loop Feed topic content URLs (https://q.loop-feed.com/v1/topic/…/content). */
  loop_home_url?: string;
  loop_away_url?: string;
  loop_home_label?: string;
  loop_away_label?: string;
  loop_home_team_id?: string;
  loop_away_team_id?: string;
};

export function loadFixturePresets(): FixturePreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is FixturePreset => {
        return (
          !!row &&
          typeof row === "object" &&
          typeof (row as FixturePreset).id === "string" &&
          typeof (row as FixturePreset).label === "string" &&
          typeof (row as FixturePreset).sport_id === "string" &&
          typeof (row as FixturePreset).match_id === "string"
        );
      })
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function saveFixturePresets(next: FixturePreset[]): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
