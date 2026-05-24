#!/usr/bin/env node
/**
 * Import Premier League fixtures + Betway match IDs from Betway Scores.
 * Writes data/local/plexa-match-report/epl-fixtures.json and merges into fixture-calendar.json
 *
 * Usage: node scripts/seed-epl-schedule.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { fetchBetwayListingFixtures } from "./lib/fetch-betway-listing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "local", "plexa-match-report");

const BETWAY_URL =
  "https://www.betwayscores.com/football/league/premier-league-72602/72602/upcomings";
const EDITORIAL_BRANDS = ["football365", "teamtalk", "planet-football", "sport365"];
const COMPETITION = "Premier League";

async function main() {
  console.log(`Fetching Betway Scores Premier League fixtures from:\n  ${BETWAY_URL}\n`);
  const betwayRows = await fetchBetwayListingFixtures(BETWAY_URL, { group: "EPL" });
  const fixtures = betwayRows.map((row) => ({
    slug: `epl-bw-${row.betwayMatchId}`,
    date: row.date,
    kickoffIso: row.kickoffIso ?? `${row.date} 15:00`,
    group: row.group ?? "EPL",
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    competition: COMPETITION,
    targetBrands: [...EDITORIAL_BRANDS],
    betwayMatchId: row.betwayMatchId,
    sixLogicSportId: "1",
    sixLogicMatchId: null,
  }));
  console.log(`Imported ${fixtures.length} fixtures (${fixtures.filter((f) => f.betwayMatchId).length} with Betway IDs).`);

  await fs.mkdir(DATA_DIR, { recursive: true });

  const jsonPath = path.join(DATA_DIR, "epl-fixtures.json");
  await fs.writeFile(jsonPath, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), fixtures }, null, 2));
  console.log(`Wrote ${jsonPath}`);

  const csvPath = path.join(DATA_DIR, "epl-fixtures.csv");
  const csvLines = [
    ["Date", "Home", "Away", "BetwayID", "Slug"].join(","),
    ...fixtures.map((f) =>
      [f.date, f.homeTeam, f.awayTeam, f.betwayMatchId ?? "", f.slug]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  await fs.writeFile(csvPath, csvLines.join("\n"));
  console.log(`Wrote ${csvPath}`);

  const calendarPath = path.join(DATA_DIR, "fixture-calendar.json");
  let calendar = { version: 1, fixtures: [] };
  try {
    calendar = JSON.parse(await fs.readFile(calendarPath, "utf-8"));
  } catch {
    /* fresh */
  }

  const existing = (calendar.fixtures ?? []).filter((row) => row.scheduleSlug === "epl");
  const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const eplRows = fixtures.map((f) => {
    const row = {
      id: f.slug,
      scheduleSlug: "epl",
      kickoffIso: f.kickoffIso,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      competition: f.competition,
      group: f.group,
      sportId: f.sixLogicSportId,
      matchId: f.sixLogicMatchId ?? "",
      betwayMatchId: f.betwayMatchId ?? undefined,
      targetBrands: f.targetBrands,
    };
    const prev =
      existing.find((r) => r.id === f.slug) ??
      existing.find(
        (r) => normalize(r.homeTeam) === normalize(f.homeTeam) && normalize(r.awayTeam) === normalize(f.awayTeam),
      );
    if (!prev) return row;
    return {
      ...row,
      reportProjectId: prev.reportProjectId,
      reportCompletedAt: prev.reportCompletedAt,
      reportDisplayLabel: prev.reportDisplayLabel,
    };
  });

  const other = (calendar.fixtures ?? []).filter((row) => row.scheduleSlug !== "epl");
  calendar.fixtures = [...eplRows, ...other];
  await fs.writeFile(calendarPath, JSON.stringify(calendar, null, 2));
  console.log(`Merged ${eplRows.length} EPL fixtures into ${calendarPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
