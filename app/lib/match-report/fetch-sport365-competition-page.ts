import { extractSport365NextDataJson } from "@/app/lib/match-report/fetch-sport365-match-page";

const FETCH_MS = 20_000;

export type Sport365StageRef = {
  stageId: string;
  competition: string;
  stageCode?: string;
  sourceUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSport365CompetitionUrl(sourceUrl: string): string {
  const parsed = new URL(sourceUrl.trim());
  if (!/(^|\.)sport365\.com$/i.test(parsed.hostname)) {
    throw new Error("Use a Sport365 competition URL (e.g. premier-league#/top-scorers).");
  }
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export async function resolveSport365StageRef(sourceUrl: string): Promise<Sport365StageRef> {
  const source = normalizeSport365CompetitionUrl(sourceUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(source, {
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "PlanetSportStudio/1.0 (match-report-builder)",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Sport365 HTTP ${res.status}`);
    const html = await res.text();
    const nextData = extractSport365NextDataJson(html);
    const pageProps =
      isRecord(nextData) && isRecord(nextData.props) && isRecord(nextData.props.pageProps)
        ? nextData.props.pageProps
        : null;
    const stageObj = pageProps && isRecord(pageProps.stageObj) ? pageProps.stageObj : null;
    const stageId = typeof stageObj?.st_id === "string" ? stageObj.st_id : "";
    if (!stageId) throw new Error("Could not resolve Sport365 stage ID from competition URL.");
    return {
      stageId,
      competition: typeof stageObj?.st_name === "string" ? stageObj.st_name : "Competition",
      stageCode: typeof stageObj?.st_code === "string" ? stageObj.st_code : undefined,
      sourceUrl: source,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSport365Json<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(`https://www.sport365.com${path}`, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "PlanetSportStudio/1.0 (match-report-builder)",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Sport365 API HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
