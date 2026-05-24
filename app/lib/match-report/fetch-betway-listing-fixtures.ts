import "server-only";

import {
  enrichBetwayListingFixture,
  normalizeBetwayTeamName,
  parseBetwayTeamsFromCard,
} from "@/app/lib/match-report/betway-listing-parse";
import type { BetwayListingParsedFixture, BetwayListingRawFixture } from "@/app/lib/match-report/betway-listing-types";
import { loadPuppeteer, resolvePuppeteerLaunchOptions } from "@/app/lib/puppeteer-launch";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export class BetwayListingFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BetwayListingFetchError";
  }
}

export async function scrapeBetwayListingFixtures(listingUrl: string): Promise<BetwayListingRawFixture[]> {
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
    await page.goto(listingUrl, { waitUntil: "networkidle2", timeout: 90_000 });
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
      throw new BetwayListingFetchError(`No fixtures found on Betway listing: ${listingUrl}`);
    }

    return rows.map((row) => {
      const teams = parseBetwayTeamsFromCard(row.cardText);
      return {
        ...row,
        homeTeam: normalizeBetwayTeamName(teams?.homeTeam ?? row.homeTeam),
        awayTeam: normalizeBetwayTeamName(teams?.awayTeam ?? row.awayTeam),
      };
    });
  } finally {
    await browser.close();
  }
}

export async function fetchBetwayListingFixtures(
  listingUrl: string,
  enrich?: (raw: BetwayListingRawFixture) => BetwayListingParsedFixture,
): Promise<BetwayListingParsedFixture[]> {
  const raw = await scrapeBetwayListingFixtures(listingUrl);
  const mapper = enrich ?? ((row) => enrichBetwayListingFixture(row));
  return raw.map(mapper);
}
