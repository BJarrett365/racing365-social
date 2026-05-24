import "server-only";

import {
  extractPlanetFootballRowsFromUnknown,
  isValidPlanetFootballTableUrl,
  parsePlanetFootballTable,
} from "@/app/lib/planet-football-table-parser";
import { planetFootballTableView, type PlanetFootballTableView } from "@/app/lib/planet-football-table-views";
import { withPlanetFootballTeamLogoUrls } from "@/app/lib/planet-football-team-logos";
import { loadPuppeteer, resolvePuppeteerLaunchOptions } from "@/app/lib/puppeteer-launch";
import type { PlanetFootballTableRow } from "@/types";
import type { PlanetFootballParsedTable } from "@/app/lib/planet-football-table-parser";

function isPremierLeagueTableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (/(^|\.)sport365\.com$/i.test(parsed.hostname) &&
        /\/football\/england\/premier-league\/?$/i.test(parsed.pathname)) ||
      (/(^|\.)football365\.com$/i.test(parsed.hostname) &&
        /\/premier-league\/table(?:\/[^/]+)?\/?$/i.test(parsed.pathname))
    );
  } catch {
    return false;
  }
}

function isFootball365Url(url: string): boolean {
  try {
    return /(^|\.)football365\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function withFootball365TableView(url: string, view: PlanetFootballTableView): string {
  if (!isFootball365Url(url)) return url;
  const next = new URL(url);
  next.pathname = `/premier-league/table/${view.slug ?? "full-table"}`;
  return next.toString();
}

function toInt(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseRenderedRowText(text: string, logoUrl?: string): PlanetFootballTableRow | null {
  const tokens = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (tokens.length < 4 || !/^\d{1,3}$/.test(tokens[0] ?? "")) return null;
  const numericLike = (v: string) => /^[+-]?\d+(?:\.\d+)?%?$/.test(v) || /^\d+\s*[-:]\s*\d+$/.test(v);
  let statStart = -1;
  for (let i = 1; i < tokens.length; i += 1) {
    const rest = tokens.slice(i).filter(numericLike);
    if (rest.length >= 5 || (rest.length >= 2 && i >= 2)) {
      statStart = i;
      break;
    }
  }
  if (statStart < 2) return null;
  const stats = tokens.slice(statStart).filter(numericLike);
  const team = tokens.slice(1, statStart).join(" ").trim();
  if (!team || stats.length < 2) return null;
  const metricValue = stats.at(-1) ?? "";
  return {
    position: toInt(tokens[0]),
    team,
    logoUrl,
    played: toInt(stats[0]),
    won: stats.length >= 5 ? toInt(stats[1]) : 0,
    drawn: stats.length >= 5 ? toInt(stats[2]) : 0,
    lost: stats.length >= 5 ? toInt(stats[3]) : 0,
    pointsDifference: stats.length >= 6 ? String(stats.at(-2) ?? "") : String(metricValue),
    points: toInt(metricValue),
  };
}

async function parseViaRenderedPage(
  url: string,
  tableView: PlanetFootballTableView,
): Promise<PlanetFootballParsedTable | null> {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch(await resolvePuppeteerLaunchOptions());
  const responsePayloads: unknown[] = [];
  const football365 = isFootball365Url(url);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    page.on("response", (res) => {
      const responseUrl = res.url();
      const contentType = res.headers()["content-type"] ?? "";
      if (!/json/i.test(contentType)) return;
      if (!football365 && !/standing|standings|table|league|competition|football/i.test(responseUrl)) return;
      void res
        .json()
        .then((json) => responsePayloads.push(json as unknown))
        .catch(() => undefined);
    });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36",
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    if (football365) {
      await page.waitForSelector("table tbody tr, [class*='table'] tr, tr", { timeout: 15000 }).catch(() => undefined);
    }
    const html = await page.content();
    for (const payload of responsePayloads) {
      const rows = extractPlanetFootballRowsFromUnknown(payload);
      if (rows.length >= 2) {
        return {
          source: "Sport365",
          sourceUrl: url,
          competition: `Premier League ${tableView.label}`,
          updatedAt: new Date().toISOString(),
          columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
          rows: withPlanetFootballTeamLogoUrls(rows),
        };
      }
    }
    if (football365) {
      const rowTexts = await page.$$eval("table tbody tr, tr", (rows) =>
        rows.map((row) => row.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean),
      );
      const parsedRows = rowTexts
        .map((text) => parseRenderedRowText(text))
        .filter((row): row is PlanetFootballTableRow => Boolean(row?.team && row.position > 0));
      if (parsedRows.length >= 2) {
        return {
          source: "Sport365",
          sourceUrl: url,
          competition: `Premier League ${tableView.label}`,
          updatedAt: new Date().toISOString(),
          columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
          rows: withPlanetFootballTeamLogoUrls(parsedRows),
        };
      }
    }
    try {
      const parsed = parsePlanetFootballTable(html, url);
      return { ...parsed, rows: withPlanetFootballTeamLogoUrls(parsed.rows) };
    } catch {
      return null;
    }
  } finally {
    await browser.close();
  }
}

async function parsePremierLeagueOfficialFallback(
  url: string,
  tableView: PlanetFootballTableView,
): Promise<PlanetFootballParsedTable | null> {
  if (!isPremierLeagueTableUrl(url)) return null;
  const apiUrl = "https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8/seasons/2024/standings?live=false";
  const res = await fetch(apiUrl, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as unknown;
  const rows = extractPlanetFootballRowsFromUnknown(json);
  if (rows.length < 2) return null;
  return {
    source: "Sport365",
    sourceUrl: url,
    competition: `Premier League ${tableView.label}`,
    updatedAt: new Date().toISOString(),
    columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
    rows: withPlanetFootballTeamLogoUrls(rows),
  };
}

/** Fetch and parse a Sport365 / Football365 league table URL. */
export async function importPlanetFootballTableFromUrl(
  requestedUrl: string,
  tableViewId?: string,
): Promise<PlanetFootballParsedTable> {
  const tableView = planetFootballTableView(tableViewId);
  const url = withFootball365TableView(requestedUrl.trim(), tableView);
  if (!isValidPlanetFootballTableUrl(url)) {
    throw new Error("Use a Sport365 or Football365 league table URL.");
  }

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; PlanetSportStudioTableImporter/1.0)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Could not load league table page (HTTP ${res.status}).`);
  }
  const html = await res.text();
  try {
    if (isFootball365Url(url)) {
      throw new Error("Football365 table views require rendered page parsing.");
    }
    const data = parsePlanetFootballTable(html, url);
    return { ...data, rows: withPlanetFootballTeamLogoUrls(data.rows) };
  } catch {
    const rendered = await parseViaRenderedPage(url, tableView);
    const fallback = rendered ?? (await parsePremierLeagueOfficialFallback(url, tableView));
    if (!fallback) throw new Error("Could not find league table rows in the page data.");
    return fallback;
  }
}
