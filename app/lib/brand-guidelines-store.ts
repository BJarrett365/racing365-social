import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import type { RunwayBgBrand } from "@/app/lib/runway-background-prompt-types";

const REL = "data/local/brand-guidelines.json";
const BLOB_STORE_NAME = "plexa-brand-guidelines";
const BLOB_STORE_KEY = "brand-guidelines.json";

export type BrandGuidelineSlug = "plexa" | "racing365" | "teamtalk" | "planetf1" | "f365";

export type BrandGuidelineEntry = {
  slug: BrandGuidelineSlug;
  label: string;
  body: string;
  updatedAt: string;
};

export type BrandGuidelinesFile = {
  brands: Record<BrandGuidelineSlug, Omit<BrandGuidelineEntry, "slug">>;
};

const META: Record<BrandGuidelineSlug, { label: string; defaultBody: string }> = {
  plexa: {
    label: "Plexa Studio",
    defaultBody: `[Plexa Studio — UI Kit missing]

Add data/plexa-brand-guidelines-ui-kit.txt (Plexa Studio App UI Kit) to the repo, or paste guidelines on the Brand Guidelines page.`,
  },
  racing365: {
    label: "Racing365",
    defaultBody: `[Racing365 — placeholder]

Horse-racing Shorts: journalist voice, odds phrasing, sign-offs, and betting-adjacent copy rules.

Replace with excerpts from your Racing365 brand guidelines.`,
  },
  teamtalk: {
    label: "TEAMtalk",
    defaultBody: `[TEAMtalk — placeholder]

Football media voice, transfer/news framing, and CTA style.

Replace with excerpts from your TEAMtalk brand guidelines.`,
  },
  planetf1: {
    label: "PlanetF1",
    defaultBody: `[PlanetF1 — placeholder]

F1 coverage tone, technical vs. fan-friendly balance, and sign-off patterns.

Replace with excerpts from your PlanetF1 brand guidelines.`,
  },
  f365: {
    label: "F365 (Football365)",
    defaultBody: `[F365 — placeholder]

Bundled file data/f365-brand-guidelines-full.txt was missing — add the Football365 brand guidelines here.`,
  },
};

const SLUGS = Object.keys(META) as BrandGuidelineSlug[];

/** PLEXA App UI Kit. Source: data/plexa-brand-guidelines-ui-kit.txt */
function loadPlexaGuidelinesText(): string {
  const full = path.join(process.cwd(), "data", "plexa-brand-guidelines-ui-kit.txt");
  try {
    const raw = readFileSync(full, "utf8");
    return raw.trimEnd() ? `${raw.trimEnd()}\n` : META.plexa.defaultBody;
  } catch {
    return META.plexa.defaultBody;
  }
}

function shouldMigratePlexaPlaceholder(body: string): boolean {
  return body.trimStart().startsWith("[PLEXA — placeholder]");
}

/** Full text transcribed from F365 Brand Guidelines V1.0 (PDF). Source: data/f365-brand-guidelines-full.txt */
function loadF365GuidelinesText(): string {
  const full = path.join(process.cwd(), "data", "f365-brand-guidelines-full.txt");
  try {
    const raw = readFileSync(full, "utf8");
    return raw.trimEnd() ? `${raw.trimEnd()}\n` : META.f365.defaultBody;
  } catch {
    return META.f365.defaultBody;
  }
}

function shouldMigrateF365Placeholder(body: string): boolean {
  return body.trimStart().startsWith("[F365 — placeholder]");
}

function defaultFile(): BrandGuidelinesFile {
  const brands = {} as BrandGuidelinesFile["brands"];
  const now = new Date().toISOString();
  for (const slug of SLUGS) {
    const m = META[slug];
    const body =
      slug === "f365" ? loadF365GuidelinesText() : slug === "plexa" ? loadPlexaGuidelinesText() : m.defaultBody;
    brands[slug] = {
      label: m.label,
      body,
      updatedAt: now,
    };
  }
  return { brands };
}

export function listBrandGuidelineMeta(): { slug: BrandGuidelineSlug; label: string }[] {
  return SLUGS.map((slug) => ({ slug, label: META[slug].label }));
}

export async function readBrandGuidelinesFile(): Promise<BrandGuidelinesFile> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<unknown>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    if (!data) {
      const init = defaultFile();
      await writeBrandGuidelinesFile(init);
      return init;
    }
    return normalizeBrandGuidelinesFile(data);
  }

  const full = path.join(process.cwd(), REL);
  try {
    const raw = await fs.readFile(full, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const base = normalizeBrandGuidelinesFile(parsed);
    await migrateBrandGuidelinesIfNeeded(base);
    return base;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      const init = defaultFile();
      await writeBrandGuidelinesFile(init);
      return init;
    }
    throw e;
  }
}

async function migrateBrandGuidelinesIfNeeded(base: BrandGuidelinesFile): Promise<void> {
  let changed = false;
  if (shouldMigrateF365Placeholder(base.brands.f365.body)) {
    base.brands.f365 = {
      ...base.brands.f365,
      body: loadF365GuidelinesText(),
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (shouldMigratePlexaPlaceholder(base.brands.plexa.body)) {
    base.brands.plexa = {
      ...base.brands.plexa,
      body: loadPlexaGuidelinesText(),
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (changed) await writeBrandGuidelinesFile(base);
}

function normalizeBrandGuidelinesFile(parsed: unknown): BrandGuidelinesFile {
  if (!parsed || typeof parsed !== "object") return defaultFile();
  const p = parsed as Record<string, unknown>;
  const b = p.brands;
  if (!b || typeof b !== "object") return defaultFile();
  const base = defaultFile();
  for (const slug of SLUGS) {
    const row = (b as Record<string, unknown>)[slug];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const body = typeof o.body === "string" ? o.body : base.brands[slug].body;
    const label = typeof o.label === "string" ? o.label : base.brands[slug].label;
    const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : base.brands[slug].updatedAt;
    base.brands[slug] = { label, body, updatedAt };
  }
  return base;
}

async function writeBrandGuidelinesFile(data: BrandGuidelinesFile): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, data);
    return;
  }

  const full = path.join(process.cwd(), REL);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function updateBrandGuideline(
  slug: BrandGuidelineSlug,
  body: string,
): Promise<BrandGuidelineEntry> {
  const cur = await readBrandGuidelinesFile();
  const now = new Date().toISOString();
  const prev = cur.brands[slug];
  const entry: BrandGuidelineEntry = {
    slug,
    label: prev.label,
    body,
    updatedAt: now,
  };
  cur.brands[slug] = { label: entry.label, body: entry.body, updatedAt: entry.updatedAt };
  await writeBrandGuidelinesFile(cur);
  return entry;
}

/** Map editor / template format → brand guideline slug for AI. */
export function contentFormatToBrandSlug(format: string): BrandGuidelineSlug {
  switch (format) {
    case "next-off":
    case "fast-results":
    case "racecard":
      return "racing365";
    case "football-lineups":
      return "f365";
    case "teamtalk-news":
      return "teamtalk";
    case "f1-grid":
    case "f1-results":
      return "planetf1";
    default:
      return "plexa";
  }
}

export function runwayBrandToSlug(brand: RunwayBgBrand): BrandGuidelineSlug {
  switch (brand) {
    case "Racing365":
      return "racing365";
    case "TEAMtalk":
      return "teamtalk";
    case "PlanetF1":
      return "planetf1";
    default:
      return "plexa";
  }
}

/** Text appended to AI user prompts (voiceover). Empty if body is blank/whitespace-only. */
export async function getBrandGuidelinesAppendixForFormat(format: string): Promise<string> {
  const slug = contentFormatToBrandSlug(format);
  const data = await readBrandGuidelinesFile();
  return (data.brands[slug]?.body ?? "").trim();
}

export async function getBrandGuidelinesAppendixForRunwayBrand(brand: RunwayBgBrand): Promise<string> {
  const slug = runwayBrandToSlug(brand);
  const data = await readBrandGuidelinesFile();
  return (data.brands[slug]?.body ?? "").trim();
}
