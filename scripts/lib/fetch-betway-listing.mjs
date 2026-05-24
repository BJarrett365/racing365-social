import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

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

function normalizeBetwayTeamName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/\bAnd Hove\b/i, "and Hove")
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

/** @param {string} listingUrl @param {{ group?: string }} [options] */
export async function fetchBetwayListingFixtures(listingUrl, options = {}) {
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
    await page.goto(listingUrl, { waitUntil: "networkidle2", timeout: 90000 });
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
            dateHeading: currentDate,
            cardText: (card?.textContent || "").replace(/\s+/g, " ").trim(),
          });
        }
        for (const child of el.children ?? []) walk(child);
      };
      walk(document.body);
      return out;
    });
    if (raw.length === 0) throw new Error(`No fixtures found on Betway listing: ${listingUrl}`);
    return raw.map((row) => {
      const teams = parseTeamsFromCard(row.cardText);
      const date = parseDateHeading(row.dateHeading);
      const kickoffTime = row.cardText.match(/(\d{2}:\d{2})/)?.[1] ?? "15:00";
      return {
        betwayMatchId: row.betwayMatchId,
        betwaySlug: row.betwaySlug,
        date,
        kickoffIso: date ? `${date} ${kickoffTime}` : undefined,
        group: options.group,
        homeTeam: teams?.homeTeam ?? row.betwaySlug.split("-vs-")[0],
        awayTeam: teams?.awayTeam ?? row.betwaySlug.split("-vs-")[1],
      };
    });
  } finally {
    await browser.close();
  }
}
