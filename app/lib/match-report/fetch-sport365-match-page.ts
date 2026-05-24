import { assertSport365MatchUrl } from "@/app/lib/match-report/parse-sport365-commentary";

const FETCH_MS = 20_000;

export function extractSport365NextDataJson(html: string): unknown | null {
  const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as unknown;
  } catch {
    return null;
  }
}

export async function fetchSport365MatchPageHtml(sourceUrl: string): Promise<string> {
  const url = assertSport365MatchUrl(sourceUrl).toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "PlanetSportStudio/1.0 (match-report-builder)",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Sport365 HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}
