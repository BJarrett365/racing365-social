import "server-only";

import { BETWAY_WC2026_UPCOMINGS_URL, type BetwayWc2026RawFixture } from "@/app/lib/match-report/betway-wc2026-constants";
import { enrichBetwayWc2026Fixture } from "@/app/lib/match-report/betway-wc2026-parse";
import type { BetwayWc2026ParsedFixture } from "@/app/lib/match-report/betway-wc2026-constants";
import { loadPuppeteer, resolvePuppeteerLaunchOptions } from "@/app/lib/puppeteer-launch";
import type { Wc2026FixtureSeed } from "@/app/lib/match-report/wc2026-schedule";
import { WC2026_COMPETITION, WC2026_EDITORIAL_BRANDS } from "@/app/lib/match-report/wc2026-schedule";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export class BetwayWc2026FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BetwayWc2026FetchError";
  }
}

async function scrapeBetwayDomFixtures(url = BETWAY_WC2026_UPCOMINGS_URL): Promise<BetwayWc2026RawFixture[]> {
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch(await resolvePuppeteerLaunchOptions());
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(90_000);
    await page.setUserAgent(BROWSER_UA);
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-GB,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90_000 });
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const rows = await page.evaluate(() => {
      const out: Array<{
        betwayMatchId: string;
        betwaySlug: string;
        betwayHref: string;
        dateHeading: string;
        cardText: string;
        homeTeam: string;
        awayTeam: string;
      }> = [];
      const seen = new Set<string>();
      let currentDate = "";

      const walk = (el: Element | null) => {
        if (!el) return;
        const text = el.textContent?.trim() ?? "";
        if (el.tagName.toLowerCase() === "h2" && /,\s*\d{1,2}\s+\w+\s+\d{4}/.test(text)) {
          currentDate = text;
        }
        if (el instanceof HTMLAnchorElement && el.href.includes("/match-detail/")) {
          const href = el.getAttribute("href") ?? "";
          const match = href.match(/\/match-detail\/([^/]+)\/(\d+)/);
          if (!match || seen.has(match[2]!)) return;
          seen.add(match[2]!);
          const card =
            el.closest("article, li, div") ??
            el.parentElement?.parentElement ??
            el.parentElement;
          const cardText = card?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const slugPart = match[1]!;
          const [homeSlug, awaySlug] = slugPart.split("-vs-");
          const titleFromSlug = (slug: string) =>
            slug
              .split("-")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ");
          out.push({
            betwayMatchId: match[2]!,
            betwaySlug: slugPart,
            betwayHref: href.split("#")[0] ?? href,
            dateHeading: currentDate,
            cardText,
            homeTeam: titleFromSlug(homeSlug ?? ""),
            awayTeam: titleFromSlug(awaySlug ?? ""),
          });
        }
        for (const child of el.children) walk(child);
      };

      walk(document.body);
      return out;
    });

    if (rows.length === 0) {
      throw new BetwayWc2026FetchError("No Betway World Cup fixtures found on the listing page.");
    }
    return rows;
  } finally {
    await browser.close();
  }
}

export async function fetchBetwayWc2026Fixtures(
  url = BETWAY_WC2026_UPCOMINGS_URL,
): Promise<BetwayWc2026ParsedFixture[]> {
  const raw = await scrapeBetwayDomFixtures(url);
  return raw.map(enrichBetwayWc2026Fixture);
}

export function betwayFixturesToWc2026Seeds(fixtures: BetwayWc2026ParsedFixture[]): Wc2026FixtureSeed[] {
  return fixtures.map((fixture) => ({
    slug: `wc2026-bw-${fixture.betwayMatchId}`,
    date: fixture.date ?? "2026-06-11",
    kickoffIso: fixture.kickoffIso ?? `${fixture.date ?? "2026-06-11"} 19:00`,
    group: fixture.group ?? fixture.stage,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    competition: WC2026_COMPETITION,
    targetBrands: [...WC2026_EDITORIAL_BRANDS],
    betwayMatchId: fixture.betwayMatchId,
    sixLogicSportId: "1",
    sixLogicMatchId: null,
  }));
}

export async function fetchBetwayWc2026Seeds(url = BETWAY_WC2026_UPCOMINGS_URL): Promise<Wc2026FixtureSeed[]> {
  const fixtures = await fetchBetwayWc2026Fixtures(url);
  return betwayFixturesToWc2026Seeds(fixtures);
}
