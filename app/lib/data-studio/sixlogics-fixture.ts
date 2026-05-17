/**
 * SixLogics SportccFixture — server-only fetch. Credentials from env, never sent to the browser.
 */

const DEFAULT_BASE = "https://datafeed.sixlogics.com/api";
const FETCH_TIMEOUT_MS = 28_000;

export class SixlogicsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SixlogicsConfigError";
  }
}

export class SixlogicsFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SixlogicsFetchError";
  }
}

function fixtureUrl(base: string, userID: string, pass: string, sportId: string, matchId: string): string {
  const root = base.replace(/\/+$/, "");
  const u = new URL(`${root}/SportccFixture`);
  u.searchParams.set("userID", userID);
  u.searchParams.set("pass", pass);
  u.searchParams.set("sport_id", sportId);
  u.searchParams.set("match_id", matchId);
  return u.toString();
}

/** Dot-paths up to maxPaths (breadth-biased shallow keys first). */
export function flattenJsonKeyPaths(obj: unknown, maxPaths = 120): string[] {
  const out: string[] = [];
  const walk = (val: unknown, prefix: string, depth: number) => {
    if (out.length >= maxPaths || depth > 8) return;
    if (val === null || typeof val !== "object") return;
    if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
        walk(val[0], `${prefix}[0]`, depth + 1);
      }
      return;
    }
    for (const k of Object.keys(val as Record<string, unknown>)) {
      if (out.length >= maxPaths) return;
      const path = prefix ? `${prefix}.${k}` : k;
      out.push(path);
      walk((val as Record<string, unknown>)[k], path, depth + 1);
    }
  };
  walk(obj, "", 0);
  return out;
}

export type SportccFixtureFetchResult = {
  payload: unknown;
  keyPaths: string[];
};

export async function fetchSportccFixture(params: {
  sportId: string;
  matchId: string;
}): Promise<SportccFixtureFetchResult> {
  const base = process.env.SIXLOGICS_FIXTURE_BASE?.trim() || DEFAULT_BASE;
  const userID = process.env.SIXLOGICS_USER_ID?.trim();
  const pass = process.env.SIXLOGICS_PASS?.trim();
  if (!userID || !pass) {
    throw new SixlogicsConfigError(
      "Missing SixLogics credentials. Add SIXLOGICS_USER_ID and SIXLOGICS_PASS to .env.local (see .env.example).",
    );
  }

  const url = fixtureUrl(base, userID, pass, params.sportId, params.matchId);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "User-Agent": "PlanetSportStudio/1.0 (data-studio)",
      },
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    if ((e as Error).name === "AbortError") {
      throw new SixlogicsFetchError(`Fixture request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw new SixlogicsFetchError(msg);
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  let payload: unknown = text;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { _parseNote: "Response was not valid JSON; raw text returned under _raw.", _raw: text.slice(0, 50_000) };
    }
  }

  if (!res.ok) {
    throw new SixlogicsFetchError(
      `SixLogics HTTP ${res.status}: ${text.slice(0, 500)}${text.length > 500 ? "…" : ""}`,
      res.status,
    );
  }

  const keyPaths = typeof payload === "object" && payload !== null ? flattenJsonKeyPaths(payload) : [];

  return { payload, keyPaths };
}
