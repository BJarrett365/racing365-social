import { cache } from "react";
import { getRacingDataProvider } from "@/app/features/data/providers";
import { BRAND_SHORTS, BRAND_SHORT_SINGULAR, BRAND_SUITE } from "@/app/lib/brand";

export type EditorType =
  | "next-off"
  | "fast-results"
  | "racecard"
  | "football-lineups"
  | "teamtalk-news"
  | "f1-grid"
  | "f1-results"
  | "planet-football-table"
  | "planet-rugby-table"
  | "team-line-up"
  | "team-sheet"
  | "score-line";

export type EditorSeo = {
  /** Visible page heading */
  headline: string;
  /** `<title>` / Open Graph */
  pageTitle: string;
  description: string;
};

function fallback(id: string, type: EditorType): EditorSeo {
  const label = type.replace(/-/g, " ");
  return {
    headline: id,
    pageTitle: `${label} · ${id} | ${BRAND_SUITE}`,
    description: `Create ${BRAND_SHORTS} for ${id}.`,
  };
}

async function loadEditorSeo(type: EditorType, id: string): Promise<EditorSeo> {
  const p = getRacingDataProvider();
  try {
    if (type === "next-off") {
      const b = await p.getNextOffById(id);
      if (!b) return fallback(id, type);
      const { race } = b;
      const headline = `${race.course} ${race.raceTime} — ${race.title}`;
      return {
        headline,
        pageTitle: `${headline} | Next off tips & Shorts`,
        description: `Edit and export a ${BRAND_SHORT_SINGULAR} for ${race.course} ${race.raceTime}: ${race.title}.`,
      };
    }
    if (type === "fast-results") {
      const b = await p.getFastResultById(id);
      if (!b) return fallback(id, type);
      const { race } = b.result;
      const headline = `${race.course} ${race.raceTime} — ${race.title} result`;
      return {
        headline,
        pageTitle: `${race.course} ${race.raceTime} result | Fast results Shorts`,
        description: `Build a results Short for ${race.course} ${race.raceTime}: ${race.title}.`,
      };
    }
    if (type === "football-lineups") {
      const b = await p.getFootballLineupById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.home.name} vs ${b.away.name} — ${b.matchDate}`;
      return {
        headline,
        pageTitle: `${headline} | Football line-ups Shorts`,
        description: `Edit line-up, bench, and injuries Shorts for ${b.home.name} vs ${b.away.name}.`,
      };
    }
    if (type === "teamtalk-news") {
      const b = await p.getTeamtalkNewsById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.tag}: ${(b.headlineLines[0] ?? "TEAMtalk News").slice(0, 80)}`;
      return {
        headline,
        pageTitle: `${headline} | TEAMtalk News Shorts`,
        description: `Edit TEAMtalk-style transfer news Shorts: headlines, player image, logos, and CTA.`,
      };
    }
    if (type === "f1-grid") {
      const b = await p.getF1GridById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.title} — ${b.subtitle}`;
      return {
        headline,
        pageTitle: `${headline} | F1 Grid`,
        description: `Edit F1 starting grid graphics: drivers, lap times, team colours, intro and outro.`,
      };
    }
    if (type === "f1-results") {
      const b = await p.getF1ResultsById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.title} — ${b.subtitle}`;
      return {
        headline,
        pageTitle: `${headline} | F1 Results`,
        description: `Edit F1 race results graphics: classification, stops, fastest lap on outro, intro and footer.`,
      };
    }
    if (type === "planet-rugby-table") {
      const b = await p.getPlanetRugbyTableById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.table.competition} — ${b.headline ?? "Latest Table"}`;
      return {
        headline,
        pageTitle: `${headline} | Planet Rugby Shorts`,
        description: `Edit Planet Rugby table Shorts for ${b.table.competition}: layout, rows, and head-to-head mode.`,
      };
    }
    if (type === "planet-football-table") {
      const b = await p.getPlanetFootballTableById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.table.competition} — ${b.headline ?? "Latest Table"}`;
      return {
        headline,
        pageTitle: `${headline} | Planet Football Shorts`,
        description: `Edit Planet Football table Shorts for ${b.table.competition}: layout, rows, and display mode.`,
      };
    }
    if (type === "team-line-up") {
      const b = await p.getTeamLineUpById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.home.name} vs ${b.away.name} — Team Line-Up`;
      return {
        headline,
        pageTitle: `${headline} | Team Line-Up`,
        description: `Edit branded formation cards for ${b.home.name} vs ${b.away.name}.`,
      };
    }
    if (type === "team-sheet") {
      const b = await p.getTeamSheetById(id);
      if (!b) return fallback(id, type);
      const headline = `${b.home.name} vs ${b.away.name} — Team Sheet`;
      return {
        headline,
        pageTitle: `${headline} | Team Sheet`,
        description: `Edit readable team sheet graphics for ${b.home.name} vs ${b.away.name}.`,
      };
    }
    if (type === "score-line") {
      const b = await p.getScoreLineById(id);
      if (!b) return fallback(id, type);
      const ctx = b.matchContext;
      const headline = `${ctx.homeTeam} ${ctx.homeScore}–${ctx.awayScore} ${ctx.awayTeam} — Score Line`;
      return {
        headline,
        pageTitle: `${headline} | Score Line`,
        description: `Edit score line graphic for ${ctx.homeTeam} vs ${ctx.awayTeam}.`,
      };
    }
    const snap = await p.getRacecardById(id);
    if (!snap) return fallback(id, type);
    const { race } = snap;
    const headline = `${race.course} ${race.raceTime} — ${race.title}`;
    return {
      headline,
      pageTitle: `${headline} | Racecard Shorts`,
      description: `Racecard Short editor: ${race.course} ${race.raceTime}, ${race.title}.`,
    };
  } catch {
    return fallback(id, type);
  }
}

/** Deduped when used from `generateMetadata` and the page in one request. */
export const getEditorSeo = cache(loadEditorSeo);
