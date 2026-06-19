const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 28_000;

export function extractFotMobNextData(html: string): unknown {
  const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]?.trim()) {
    throw new Error("FotMob page did not include embedded match data (__NEXT_DATA__).");
  }
  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    throw new Error("FotMob __NEXT_DATA__ was not valid JSON.");
  }
}

export async function fetchFotMobMatchPage(url: string): Promise<{
  pageProps: Record<string, unknown>;
  html: string;
}> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "User-Agent": BROWSER_UA,
      },
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(`FotMob request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const html = await res.text();
  if (!res.ok) {
    throw new Error(`FotMob HTTP ${res.status}: ${html.slice(0, 300)}`);
  }
  if (html.length < 5_000) {
    throw new Error("FotMob returned an unexpectedly small page — check the match URL.");
  }

  const nextData = extractFotMobNextData(html);
  const pageProps =
    typeof nextData === "object" &&
    nextData !== null &&
    isRecord((nextData as Record<string, unknown>).props) &&
    isRecord(((nextData as Record<string, unknown>).props as Record<string, unknown>).pageProps)
      ? (((nextData as Record<string, unknown>).props as Record<string, unknown>).pageProps as Record<
          string,
          unknown
        >)
      : null;

  if (!pageProps?.content) {
    throw new Error("FotMob match page loaded but match content was missing.");
  }

  return { pageProps, html };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
