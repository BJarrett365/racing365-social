export type PlanetRugbyParsedRow = {
  position: number;
  team: string;
  logoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsDifference: string;
  points: number;
};

export type PlanetRugbyParsedTable = {
  source: "Planet Rugby";
  sourceUrl: string;
  competition: string;
  updatedAt?: string;
  imageUrl?: string;
  columns: [
    "position",
    "team",
    "played",
    "won",
    "drawn",
    "lost",
    "pointsDifference",
    "points",
  ];
  rows: PlanetRugbyParsedRow[];
};

const PLANET_RUGBY_HOST_RE = /(^|\.)planetrugby\.com$/i;

/** Canonical club crests on Planet Rugby (same pattern as the site table / manual overrides). */
export const PLANET_RUGBY_TEAM_ICONS_BASE =
  "https://www.planetrugby.com/content/themes/planet2/img/png/team-icons";

/** URLs that render as generic league badges — replace with `team-icons` where possible. */
export function isNonRenderableRugbyLeagueLogoUrl(url: string): boolean {
  return /\/rugbyunion\/leagues\//i.test(url) || /\/leagues\//i.test(url);
}

/**
 * Slug for `team-icons/{slug}.png` — mirrors typical PR filenames (e.g. Northampton Saints → northampton-saints).
 */
export function planetRugbyTeamIconSlug(teamName: string): string {
  return teamName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function planetRugbyTeamIconUrl(teamName: string): string | undefined {
  const slug = planetRugbyTeamIconSlug(teamName);
  if (!slug) return undefined;
  return `${PLANET_RUGBY_TEAM_ICONS_BASE}/${slug}.png`;
}

/**
 * Prefer a parsed img/API URL when it is usable; otherwise use the Planet Rugby `team-icons` URL from the team name.
 */
export function resolvePlanetRugbyRowLogoUrl(teamName: string, parsedLogoUrl: string | undefined): string | undefined {
  const t = teamName.trim();
  const trimmed = typeof parsedLogoUrl === "string" ? parsedLogoUrl.trim() : "";
  if (trimmed && !isNonRenderableRugbyLeagueLogoUrl(trimmed)) return trimmed;
  return planetRugbyTeamIconUrl(t);
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(text: string): string {
  return decodeHtml(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function toInt(raw: string): number {
  const n = Number(raw.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function isValidPlanetRugbyTableUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return PLANET_RUGBY_HOST_RE.test(u.hostname) && /\/tournament\/[^/]+\/table\/?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

function extractCompetition(html: string, url: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = stripTags(h1[1] ?? "");
    if (text) return text.replace(/\s+table$/i, "").trim();
  }
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).at(-2) ?? "premiership";
    return slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  } catch {
    return "Premiership";
  }
}

function extractUpdatedAt(html: string): string | undefined {
  const m =
    html.match(/(?:last\s*updated|updated)\s*[:\-]?\s*<\/?[^>]*>\s*([^<]{4,64})/i) ||
    html.match(/(Last updated[^<]{3,80})/i);
  const txt = m ? stripTags(m[1] ?? "") : "";
  return txt || undefined;
}

function extractImageUrl(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  const img = (og?.[1] ?? tw?.[1] ?? "").trim();
  return img || undefined;
}

function extractCompetitionCode(html: string): string | undefined {
  const m = html.match(/data-widget-id=["']ps-table-league["'][^>]*data-comp-code=["']([^"']+)["']/i);
  const code = (m?.[1] ?? "").trim();
  return code || undefined;
}

function extractUpdatedAtFromMeta(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i);
  const txt = (m?.[1] ?? "").trim();
  return txt || undefined;
}

type SdmsSeasonResponse = {
  data?: {
    seasons?: string[];
    current_season?: string;
    active_season?: string;
  };
};

type SdmsStandingRow = {
  competition_name?: string;
  rank?: number;
  team_name?: string;
  team_logo?: string;
  logo?: string;
  badge?: string;
  crest?: string;
  image?: string;
  icon?: string;
  played?: number;
  won?: number;
  draw?: number;
  lost?: number;
  points_diff?: number;
  points?: number;
};

type SdmsStandingResponse = {
  data?: SdmsStandingRow[];
};

function toAbsoluteUrl(maybeUrl: unknown, sourceUrl: string): string | undefined {
  if (typeof maybeUrl !== "string") return undefined;
  const raw = maybeUrl.trim();
  if (!raw) return undefined;
  if (raw.startsWith("data:image/")) return raw;
  try {
    const u = new URL(raw, sourceUrl);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    return undefined;
  }
  return undefined;
}

function extractSdmsLogoUrl(row: SdmsStandingRow, sourceUrl: string): string | undefined {
  const directKeys: Array<keyof SdmsStandingRow> = ["team_logo", "logo", "badge", "crest", "image", "icon"];
  for (const key of directKeys) {
    const value = row[key];
    const normalized = toAbsoluteUrl(value, sourceUrl);
    if (normalized) return normalized;
  }
  const dynamic = row as Record<string, unknown>;
  for (const [k, v] of Object.entries(dynamic)) {
    if (!/logo|badge|crest|icon|image/i.test(k)) continue;
    const normalized = toAbsoluteUrl(v, sourceUrl);
    if (normalized) return normalized;
  }
  return undefined;
}

function extractLogoUrlFromTeamCellHtml(teamCellHtml: string, sourceUrl: string): string | undefined {
  const attrs = ["data-src", "data-lazy-src", "src"];
  const urls: string[] = [];
  for (const attr of attrs) {
    const re = new RegExp(`<img[^>]+${attr}=["']([^"']+)["']`, "gi");
    for (const m of teamCellHtml.matchAll(re)) {
      const raw = m[1]?.trim();
      if (raw) urls.push(raw);
    }
  }
  const absolutes = urls.map((u) => toAbsoluteUrl(u, sourceUrl)).filter((x): x is string => Boolean(x));
  const icon = absolutes.find((u) => /\/team-icons\//i.test(u));
  if (icon) return icon;
  return absolutes[0];
}

async function parseViaSdms(compCode: string, sourceUrl: string, html: string): Promise<PlanetRugbyParsedTable> {
  const seasonRes = await fetch(
    `https://sdms.planetsport.com/api/rugby/union/season/all?comptitionCode=${encodeURIComponent(compCode)}`,
    { cache: "no-store" },
  );
  if (!seasonRes.ok) {
    throw new Error(`Could not load table season info (${seasonRes.status}).`);
  }
  const seasonJson = (await seasonRes.json()) as SdmsSeasonResponse;
  const season =
    seasonJson.data?.active_season?.trim() ||
    seasonJson.data?.current_season?.trim() ||
    seasonJson.data?.seasons?.at(-1)?.trim() ||
    "";
  if (!season) {
    throw new Error("Could not resolve competition season.");
  }

  const standingsRes = await fetch(
    `https://sdms.planetsport.com/api/rugby/union/standing/single-competition/${encodeURIComponent(season)}/${encodeURIComponent(compCode)}/overall`,
    { cache: "no-store" },
  );
  if (!standingsRes.ok) {
    throw new Error(`Could not load competition standings (${standingsRes.status}).`);
  }
  const standingsJson = (await standingsRes.json()) as SdmsStandingResponse;
  const apiRows = Array.isArray(standingsJson.data) ? standingsJson.data : [];
  const rows: PlanetRugbyParsedRow[] = apiRows
    .map((r) => ({
      position: Number(r.rank ?? 0),
      team: String(r.team_name ?? "").trim(),
      logoUrl: resolvePlanetRugbyRowLogoUrl(String(r.team_name ?? "").trim(), extractSdmsLogoUrl(r, sourceUrl)),
      played: Number(r.played ?? 0),
      won: Number(r.won ?? 0),
      drawn: Number(r.draw ?? 0),
      lost: Number(r.lost ?? 0),
      pointsDifference: Number.isFinite(Number(r.points_diff)) ? `${Number(r.points_diff) >= 0 ? "+" : ""}${Number(r.points_diff)}` : String(r.points_diff ?? ""),
      points: Number(r.points ?? 0),
    }))
    .filter((r) => r.position > 0 && r.team);

  if (rows.length === 0) {
    throw new Error("No standings rows returned from Planet Rugby data source.");
  }

  rows.sort((a, b) => a.position - b.position);
  return {
    source: "Planet Rugby",
    sourceUrl,
    competition: String(apiRows[0]?.competition_name ?? "").trim() || extractCompetition(html, sourceUrl),
    updatedAt: extractUpdatedAtFromMeta(html) ?? extractUpdatedAt(html),
    imageUrl: extractImageUrl(html),
    columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
    rows,
  };
}

export function parsePlanetRugbyTableHtml(html: string, sourceUrl: string): PlanetRugbyParsedTable {
  const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows: PlanetRugbyParsedRow[] = [];

  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1] ?? "";
    const cellMatches = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    const cells = cellMatches.map((m) => stripTags(m[1] ?? ""));
    if (cells.length < 8) continue;
    const pos = toInt(cells[0] ?? "");
    const team = (cells[1] ?? "").trim();
    if (!team || !pos) continue;
    const teamCellHtml = cellMatches[1]?.[1] ?? "";
    const fromCell = extractLogoUrlFromTeamCellHtml(teamCellHtml, sourceUrl);
    rows.push({
      position: pos,
      team,
      logoUrl: resolvePlanetRugbyRowLogoUrl(team, fromCell),
      played: toInt(cells[2] ?? "0"),
      won: toInt(cells[3] ?? "0"),
      drawn: toInt(cells[4] ?? "0"),
      lost: toInt(cells[5] ?? "0"),
      pointsDifference: (cells[6] ?? "").trim(),
      points: toInt(cells[7] ?? "0"),
    });
  }

  if (rows.length === 0) {
    throw new Error("Could not parse a table from this Planet Rugby page.");
  }

  rows.sort((a, b) => a.position - b.position);

  return {
    source: "Planet Rugby",
    sourceUrl,
    competition: extractCompetition(html, sourceUrl),
    updatedAt: extractUpdatedAt(html),
    imageUrl: extractImageUrl(html),
    columns: ["position", "team", "played", "won", "drawn", "lost", "pointsDifference", "points"],
    rows,
  };
}

export async function parsePlanetRugbyTable(html: string, sourceUrl: string): Promise<PlanetRugbyParsedTable> {
  const compCode = extractCompetitionCode(html);
  if (compCode) {
    try {
      return await parseViaSdms(compCode, sourceUrl, html);
    } catch {
      // Fall back to static HTML parse below.
    }
  }
  return parsePlanetRugbyTableHtml(html, sourceUrl);
}
