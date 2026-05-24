#!/usr/bin/env node
/**
 * Import WC 2026 fixtures + Betway match IDs from Betway Scores listing page.
 * Writes data/local/plexa-match-report/wc2026-fixtures.json and merges into fixture-calendar.json
 *
 * Usage:
 *   node scripts/seed-wc2026-schedule.mjs
 *   node scripts/seed-wc2026-schedule.mjs --skip-fetch
 *   node scripts/seed-wc2026-schedule.mjs --sixlogics-csv=path/to/ids.csv
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { BETWAY_WC2026_UPCOMINGS_URL, fetchBetwayWc2026Fixtures } from "./lib/fetch-betway-wc2026.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "local", "plexa-match-report");

const EDITORIAL_BRANDS = ["football365", "teamtalk", "planet-football", "sport365"];
const COMPETITION = "FIFA World Cup 2026";

/** CSV columns: slug,sixLogicMatchId OR home,away,sixLogicMatchId */
async function loadSixLogicsCsv(arg) {
  const match = arg.match(/^--sixlogics-csv=(.+)$/);
  if (!match) return {};
  const csvPath = path.resolve(ROOT, match[1]);
  const text = await fs.readFile(csvPath, "utf-8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0]?.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim().toLowerCase()) ?? [];
  const slugIdx = header.indexOf("slug");
  const homeIdx = header.indexOf("home");
  const awayIdx = header.indexOf("away");
  const idIdx = header.findIndex((h) => h.includes("sixlogic") || h === "matchid" || h === "match_id");
  const bySlug = {};
  for (const line of lines.slice(1)) {
    const cells =
      line.match(/("([^"]|"")*"|[^,]+)/g)?.map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
    const id = cells[idIdx]?.replace(/\D/g, "");
    if (!id) continue;
    if (slugIdx >= 0 && cells[slugIdx]) {
      bySlug[cells[slugIdx]] = id;
      continue;
    }
    if (homeIdx >= 0 && awayIdx >= 0) {
      const key = `${cells[homeIdx]}|${cells[awayIdx]}`.toLowerCase();
      bySlug[key] = id;
    }
  }
  return bySlug;
}

function applySixLogicsCsv(fixtures, bySlug) {
  let applied = 0;
  for (const f of fixtures) {
    const byKey = bySlug[`${f.homeTeam}|${f.awayTeam}`.toLowerCase()];
    const id = bySlug[f.slug] ?? byKey;
    if (!id) continue;
    f.sixLogicMatchId = id;
    applied += 1;
  }
  return applied;
}

async function main() {
  const skipFetch = process.argv.includes("--skip-fetch");
  const sixCsvArg = process.argv.find((arg) => arg.startsWith("--sixlogics-csv="));

  let fixtures;
  if (skipFetch) {
    try {
      const stored = JSON.parse(await fs.readFile(path.join(DATA_DIR, "wc2026-fixtures.json"), "utf-8"));
      fixtures = stored.fixtures ?? [];
      console.log(`Loaded ${fixtures.length} fixtures from wc2026-fixtures.json (--skip-fetch).`);
    } catch {
      console.error("No stored fixtures found. Run without --skip-fetch first.");
      process.exit(1);
    }
  } else {
    console.log(`Fetching Betway Scores fixtures from:\n  ${BETWAY_WC2026_UPCOMINGS_URL}\n`);
    const betwayRows = await fetchBetwayWc2026Fixtures();
    fixtures = betwayRows.map((row) => ({
      slug: row.slug,
      date: row.date,
      kickoffIso: row.kickoffIso ?? `${row.date} 19:00`,
      group: row.group,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      competition: COMPETITION,
      targetBrands: [...EDITORIAL_BRANDS],
      betwayMatchId: row.betwayMatchId,
      sixLogicSportId: "1",
      sixLogicMatchId: null,
    }));
    console.log(`Imported ${fixtures.length} fixtures from Betway (${fixtures.filter((f) => f.betwayMatchId).length} with IDs).`);
  }

  if (sixCsvArg) {
    const bySlug = await loadSixLogicsCsv(sixCsvArg);
    const applied = applySixLogicsCsv(fixtures, bySlug);
    console.log(`Applied SixLogics IDs from CSV for ${applied} fixtures.`);
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  const jsonPath = path.join(DATA_DIR, "wc2026-fixtures.json");
  await fs.writeFile(jsonPath, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), fixtures }, null, 2));
  console.log(`Wrote ${jsonPath}`);

  const csvPath = path.join(DATA_DIR, "wc2026-fixtures.csv");
  const csvLines = [
    ["Date", "Group", "Home", "Away", "BetwayID", "SixLogicsID", "Slug"].join(","),
    ...fixtures.map((f) =>
      [f.date, f.group, f.homeTeam, f.awayTeam, f.betwayMatchId ?? "", f.sixLogicMatchId ?? "", f.slug]
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

  const existingWc = (calendar.fixtures ?? []).filter((row) => row.scheduleSlug === "wc2026");
  const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const wcRows = fixtures.map((f) => {
    const row = {
      id: f.slug,
      scheduleSlug: "wc2026",
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
      existingWc.find((r) => r.id === f.slug) ??
      existingWc.find(
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

  const other = (calendar.fixtures ?? []).filter((row) => row.scheduleSlug !== "wc2026");
  calendar.fixtures = [...wcRows, ...other];
  await fs.writeFile(calendarPath, JSON.stringify(calendar, null, 2));
  console.log(`Merged ${wcRows.length} WC fixtures into ${calendarPath}`);

  const betwayFound = fixtures.filter((f) => f.betwayMatchId).length;
  const sixFound = fixtures.filter((f) => f.sixLogicMatchId).length;
  console.log(`\nDone — Betway IDs: ${betwayFound}/${fixtures.length} · SixLogics IDs: ${sixFound}/${fixtures.length}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
