import { NextResponse } from "next/server";
import {
  importSport365GroupTablesForTemplate,
  isSport365GroupStageTableUrl,
} from "@/app/lib/planet-football-table-sport365-import";
import {
  extractPlanetFootballRowsFromUnknown,
  isValidPlanetFootballTableUrl,
  parsePlanetFootballTable,
} from "@/app/lib/planet-football-table-parser";
import { planetFootballTableView, type PlanetFootballTableView } from "@/app/lib/planet-football-table-views";
import { withPlanetFootballTeamLogoUrls } from "@/app/lib/planet-football-team-logos";
import { loadPuppeteer, resolvePuppeteerLaunchOptions } from "@/app/lib/puppeteer-launch";
import type { PlanetFootballTableRow } from "@/types";

type Body = { url?: string; tableView?: string; selectedGroupCode?: string };

export const runtime = "nodejs";

function isPremierLeagueTableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)sport365\.com$/i.test(parsed.hostname) && /\/football\/england\/premier-league\/?$/i.test(parsed.pathname)
    ) || (
      /(^|\.)football365\.com$/i.test(parsed.hostname) && /\/premier-league\/table(?:\/[^/]+)?\/?$/i.test(parsed.pathname)
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

async function parseViaRenderedPage(url: string, tableView: PlanetFootballTableView): Promise<ReturnType<typeof parsePlanetFootballTable> | null> {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch(await resolvePuppeteerLaunchOptions());
  const responsePayloads: unknown[] = [];
  const football365 = isFootball365Url(url);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    page.on("response", (res) => {
      const responseUrl = res.url();
      const headers = res.headers();
      const contentType = headers["content-type"] ?? "";
      if (!/json/i.test(contentType)) return;
      if (!football365 && !/standing|standings|table|league|competition|football/i.test(responseUrl)) return;
      void res
        .json()
        .then((json) => responsePayloads.push(json as unknown))
        .catch(() => undefined);
    });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    if (football365) {
      await page.evaluate((view) => {
        const wanted = view.tableScope ?? "overall";
        const labels: Record<string, string[]> = {
          overall: ["Overall", "Full Table"],
          home: ["Home", "Home Table"],
          away: ["Away", "Away Table"],
        };
        const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
        const targets = new Set((labels[wanted] ?? labels.overall).map(normalize));
        const select = Array.from(document.querySelectorAll("select")).find((el) =>
          Array.from(el.options).some((option) => targets.has(normalize(option.textContent ?? ""))),
        );
        if (select) {
          const option = Array.from(select.options).find((item) => targets.has(normalize(item.textContent ?? "")));
          if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event("input", { bubbles: true }));
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
        const control = Array.from(document.querySelectorAll("button,a,[role='tab'],[role='button']")).find((el) =>
          targets.has(normalize(el.textContent ?? "")),
        );
        if (control instanceof HTMLElement) control.click();
      }, tableView);
      await page.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.35))).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
    await page.waitForFunction(
      () => /standings?|table|pts|played|premier league/i.test(document.body.innerText),
      { timeout: 15000 },
    ).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 1200));

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

    const domRows = await page.evaluate(() => {
      const isVisible = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const selectors = [
        "table tr",
        "[role='row']",
        "[class*='standing']",
        "[class*='table']",
        "[class*='row']",
        "li",
      ];
      const seen = new Set<string>();
      const rows: { text: string; logoUrl?: string }[] = [];
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          if (!isVisible(el)) continue;
          const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
          if (!/^\d{1,2}\s+/.test(text) || seen.has(text)) continue;
          seen.add(text);
          const img = el.querySelector("img");
          const logoUrl = img?.getAttribute("src") || img?.getAttribute("data-src") || undefined;
          rows.push({ text, logoUrl: logoUrl ? new URL(logoUrl, location.href).toString() : undefined });
        }
      }
      return rows;
    });

    const rows = domRows
      .map((row) => parseRenderedRowText(row.text, row.logoUrl))
      .filter((row): row is PlanetFootballTableRow => Boolean(row))
      .filter((row, idx, all) => all.findIndex((x) => x.position === row.position && x.team === row.team) === idx)
      .sort((a, b) => a.position - b.position);
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
    return null;
  } finally {
    await browser.close();
  }
}

function currentFootballSeason(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const startsThisYear = now.getUTCMonth() >= 6;
  const start = startsThisYear ? year : year - 1;
  return `${start}-${start + 1}`;
}

async function parsePremierLeagueFallback(url: string, tableView: PlanetFootballTableView): Promise<ReturnType<typeof parsePlanetFootballTable> | null> {
  if (!isPremierLeagueTableUrl(url)) return null;
  const season = currentFootballSeason();
  const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4328&s=${season}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    table?: Array<{
      intRank?: string;
      strTeam?: string;
      strBadge?: string;
      intPlayed?: string;
      intWin?: string;
      intDraw?: string;
      intLoss?: string;
      intGoalDifference?: string;
      intPoints?: string;
      dateUpdated?: string;
    }>;
  };
  const table = Array.isArray(json.table) ? json.table : [];
  const rows = table
    .map((row) => ({
      position: toInt(row.intRank),
      team: String(row.strTeam ?? "").trim(),
      logoUrl: row.strBadge?.trim() || undefined,
      played: toInt(row.intPlayed),
      won: toInt(row.intWin),
      drawn: toInt(row.intDraw),
      lost: toInt(row.intLoss),
      pointsDifference: String(row.intGoalDifference ?? "").trim(),
      points: toInt(row.intPoints),
    }))
    .filter((row) => row.position > 0 && row.team)
    .sort((a, b) => a.position - b.position);
  if (rows.length < 2) return null;
  return {
    source: "Sport365",
    sourceUrl: url,
    competition: `Premier League ${tableView.label}`,
    updatedAt: table[0]?.dateUpdated || new Date().toISOString(),
    columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
    rows: withPlanetFootballTeamLogoUrls(rows),
  };
}

async function parsePremierLeagueOfficialFallback(url: string, tableView: PlanetFootballTableView): Promise<ReturnType<typeof parsePlanetFootballTable> | null> {
  if (!isPremierLeagueTableUrl(url)) return null;
  const res = await fetch("https://footballapi.pulselive.com/football/standings?comps=1&compSeasons=777&altIds=true&detail=2", {
    cache: "no-store",
    headers: {
      accept: "application/json",
      origin: "https://www.premierleague.com",
      referer: "https://www.premierleague.com/",
      "user-agent": "Mozilla/5.0 (compatible; PlanetSportStudioTableImporter/1.0)",
    },
  });
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

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const tableView = planetFootballTableView(body.tableView);
  const requestedUrl = body.url?.trim() || "https://www.sport365.com/football/world-cup/group-stage#/standings";
  if (!isValidPlanetFootballTableUrl(requestedUrl)) {
    return NextResponse.json(
      { success: false, error: "Use a Sport365 football URL (league standings, group stage, or match page)." },
      { status: 400 },
    );
  }

  if (isSport365GroupStageTableUrl(requestedUrl)) {
    try {
      const imported = await importSport365GroupTablesForTemplate(requestedUrl, body.selectedGroupCode);
      return NextResponse.json({
        success: true,
        format: imported.format,
        groupTables: imported.groupTables,
        selectedGroupCode: imported.selectedGroupCode,
        data: imported.data,
        matchContext: imported.matchContext,
        matchImportWarning: imported.matchImportWarning,
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Sport365 group import failed" },
        { status: 500 },
      );
    }
  }

  const url = withFootball365TableView(requestedUrl, tableView);
  if (!isValidPlanetFootballTableUrl(url)) {
    return NextResponse.json({ success: false, error: "Use a Sport365 or Football365 table URL." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; PlanetSportStudioTableImporter/1.0)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(`Could not load football table page (${res.status}).`);
    }
    const html = await res.text();
    let data: ReturnType<typeof parsePlanetFootballTable>;
    try {
      if (isFootball365Url(url)) {
        throw new Error("Football365 table views require rendered page parsing.");
      }
      data = parsePlanetFootballTable(html, url);
      data = { ...data, rows: withPlanetFootballTeamLogoUrls(data.rows) };
    } catch {
      const rendered = await parseViaRenderedPage(url, tableView);
      const fallback = rendered ?? (await parsePremierLeagueOfficialFallback(url, tableView)) ?? (await parsePremierLeagueFallback(url, tableView));
      if (!fallback) throw new Error("Could not find Premier League table rows in the rendered page data.");
      data = fallback;
    }
    return NextResponse.json({ success: true, format: "league", data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
