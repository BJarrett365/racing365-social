import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import {
  footballScheduleBrandDisplayNames,
  planetSportBrandOptions,
  PLANET_SPORT_BRANDS,
} from "@/app/lib/planet-sport-brands/catalog";

/** Match-report editorial brands (football targets with full workflow support). */
export const SCHEDULE_EDITORIAL_BRANDS: MatchReportTargetBrand[] = [
  "football365",
  "teamtalk",
  "planet-football",
  "sport365",
];

/** All Planet Sport brand display names for Schedule Studio pickers and calendar filters. */
export const SCHEDULE_ALL_BRAND_LABELS: string[] = PLANET_SPORT_BRANDS.map((b) => b.displayName);

/** Football fixture brand tags including Grassroot Goals. */
export const SCHEDULE_FOOTBALL_BRAND_LABELS: string[] = footballScheduleBrandDisplayNames();

export function scheduleBrandSelectOptions(): { value: string; label: string }[] {
  return planetSportBrandOptions();
}
