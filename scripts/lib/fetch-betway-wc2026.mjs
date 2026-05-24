import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export const BETWAY_WC2026_UPCOMINGS_URL =
  "https://www.betwayscores.com/football/world-cup-2026/263/upcomings";

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const WC_GROUPS = {
  A: ["Mexico", "South Africa", "Korea Republic", "Czech Republic"],
  B: ["Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["USA", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

function normalizeTeam(name) {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeBetwayTeamName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/Bosnia and Herzegovina/i, "Bosnia-Herzegovina")
    .replace(/United States( of America)?/i, "USA")
    .replace(/South Korea/i, "Korea Republic")
    .replace(/Democratic Republic of Congo/i, "DR Congo")
    .replace(/Curaçao/i, "Curacao")
    .trim();
}

function parseDateHeading(heading) {
  const match = heading.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
}

function parseTeamsFromCard(cardText) {
  const cleaned = cardText.replace(/^(\d{2}:\d{2})+/i, "").trim();
  const idx = cleaned.toLowerCase().indexOf("vs");
  if (idx < 0) return null;
  return {
    homeTeam: normalizeBetwayTeamName(cleaned.slice(0, idx)),
    awayTeam: normalizeBetwayTeamName(cleaned.slice(idx + 2)),
  };
}

function inferGroup(homeTeam, awayTeam) {
  const home = normalizeTeam(homeTeam);
  const away = normalizeTeam(awayTeam);
  for (const [group, teams] of Object.entries(WC_GROUPS)) {
    const norms = teams.map(normalizeTeam);
    if (norms.includes(home) && norms.includes(away)) return group;
  }
  return null;
}

function inferStage(homeTeam, awayTeam, group) {
  if (group) return "Group";
  const label = `${homeTeam} ${awayTeam}`.toLowerCase();
  if (/winner sf|loser sf/.test(label)) return "Final";
  if (/winner qf/.test(label)) return "Semi-final";
  return "Knockout";
}

export async function fetchBetwayWc2026Fixtures(url = BETWAY_WC2026_UPCOMINGS_URL) {
  if (!process.env.PUPPETEER_CACHE_DIR && process.env.HOME) {
    process.env.PUPPETEER_CACHE_DIR = path.join(process.env.HOME, ".cache", "puppeteer");
  }
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync(MAC_CHROME) ? MAC_CHROME : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_UA);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    const raw = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      let currentDate = "";
      const walk = (el) => {
        if (!el) return;
        const text = el.textContent?.trim() ?? "";
        if (el.tagName?.toLowerCase() === "h2" && /,\s*\d{1,2}\s+\w+\s+\d{4}/.test(text)) currentDate = text;
        if (el.matches?.('a[href*="/match-detail/"]')) {
          const href = el.getAttribute("href") || "";
          const m = href.match(/\/match-detail\/([^/]+)\/(\d+)/);
          if (!m || seen.has(m[2])) return;
          seen.add(m[2]);
          const card = el.closest("article, li, div") || el.parentElement?.parentElement;
          out.push({
            betwayMatchId: m[2],
            betwaySlug: m[1],
            betwayHref: href.split("#")[0],
            dateHeading: currentDate,
            cardText: (card?.textContent || "").replace(/\s+/g, " ").trim(),
          });
        }
        for (const child of el.children ?? []) walk(child);
      };
      walk(document.body);
      return out;
    });
    if (raw.length === 0) throw new Error("No fixtures found on Betway listing page");
    return raw.map((row) => {
      const teams = parseTeamsFromCard(row.cardText);
      const date = parseDateHeading(row.dateHeading);
      const kickoffTime = row.cardText.match(/(\d{2}:\d{2})/)?.[1] ?? "19:00";
      const homeTeam = teams?.homeTeam ?? row.betwaySlug.split("-vs-")[0];
      const awayTeam = teams?.awayTeam ?? row.betwaySlug.split("-vs-")[1];
      const group = inferGroup(homeTeam, awayTeam);
      return {
        slug: `wc2026-bw-${row.betwayMatchId}`,
        date: date ?? "2026-06-11",
        kickoffIso: date ? `${date} ${kickoffTime}` : undefined,
        group: group ?? inferStage(homeTeam, awayTeam, group),
        homeTeam,
        awayTeam,
        betwayMatchId: row.betwayMatchId,
        betwayHref: row.betwayHref,
      };
    });
  } finally {
    await browser.close();
  }
}
