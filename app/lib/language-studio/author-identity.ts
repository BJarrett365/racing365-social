import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";

/** Lowercased display name → canonical slug used for journalistIdentityKey */
const DISPLAY_TO_CANONICAL_SLUG: Record<string, string> = {
  "editor f365": "editorf365",
  "joe williams": "joe-williams",
  "david tindall": "davidt",
  "steve pearson": "steve-pearson",
};

/** Author-path slug fragment → canonical display name where non-obvious */
const KNOWN_SLUG_DISPLAY: Record<string, string> = {
  editorf365: "Editor F365",
  "joe-williams": "Joe Williams",
  davidt: "David Tindall",
  "steve-pearson": "Steve Pearson",
};

const NO_AUTHOR_PATTERN = /^no\s+author$/i;

export type NormalizedAuthorIdentity = {
  displayName: string;
  /** Stable segment for journalistIdentityKey (always set when identity is valid) */
  canonicalSlug: string;
  /** Normalised author page URL when parsed from an author URL (no trailing slash). */
  authorPageUrl?: string;
  aliases: string[];
};

function trimInner(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function looksLikeAbsoluteUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw.trim());
}

function looksLikeAuthorUrl(raw: string): boolean {
  return /\/author\//i.test(raw);
}

/** Title-case each whitespace-delimited segment. */
function titleCaseWords(value: string): string {
  return trimInner(value)
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (/^f\d+$/i.test(word)) return "F" + word.slice(1).toLowerCase();
      return word.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Default slug-from-display used when no explicit mapping exists. */
function slugifyHyphen(displayName: string): string {
  return trimInner(displayName)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayFromSlug(slug: string): string {
  const key = slug.toLowerCase();
  if (KNOWN_SLUG_DISPLAY[key]) return KNOWN_SLUG_DISPLAY[key];
  return titleCaseWords(slug.replace(/-/g, " "));
}

/** Extract /author/{slug}; returns slug or null */
function extractAuthorSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/\/author\/([^/]+)/i);
  if (!match?.[1]) return null;
  const slug = decodeURIComponent(match[1]).trim();
  return slug.length ? slug.toLowerCase() : null;
}

function canonicalSlugFromPlainDisplay(displayName: string): string {
  const d = trimInner(displayName).toLowerCase();
  return DISPLAY_TO_CANONICAL_SLUG[d] ?? slugifyHyphen(displayName);
}

/**
 * Normalize a feed / RSS author field into a stable identity.
 * Returns null when the value should not create or match a journalist profile.
 */
export function normalizeAuthorIdentity(raw: unknown, _brand?: string): NormalizedAuthorIdentity | null {
  if (raw == null) return null;
  const trimmed = trimInner(typeof raw === "string" ? raw : String(raw));
  if (!trimmed.length) return null;
  if (NO_AUTHOR_PATTERN.test(trimmed)) return null;

  /** Absolute URL or scheme-relative */
  if (looksLikeAbsoluteUrl(trimmed) || trimmed.startsWith("//")) {
    try {
      const url = trimmed.startsWith("//") ? new URL(`https:${trimmed}`) : new URL(trimmed);
      url.hostname = url.hostname.replace(/^www\./i, "");
      const canonicalSlug = extractAuthorSlugFromPath(url.pathname);
      if (!canonicalSlug) return null;

      const displayName = KNOWN_SLUG_DISPLAY[canonicalSlug] ?? displayFromSlug(canonicalSlug);

      const authorPageUrl = `https://${url.hostname}/author/${encodeURIComponent(canonicalSlug)}`;

      return {
        displayName: trimInner(displayName),
        canonicalSlug,
        authorPageUrl,
        aliases: uniqueAliases([trimmed, displayName]),
      };
    } catch {
      /** Try path-only author URL parsing below */
    }
  }

  if (looksLikeAuthorUrl(trimmed)) {
    const pathPart = trimmed.includes("://")
      ? trimmed.replace(/^https?:\/\/[^/]+/i, "") || trimmed
      : trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
    const canonicalSlug = extractAuthorSlugFromPath(pathPart);
    if (!canonicalSlug) return null;
    const displayName = KNOWN_SLUG_DISPLAY[canonicalSlug] ?? displayFromSlug(canonicalSlug);
    return {
      displayName: trimInner(displayName),
      canonicalSlug,
      aliases: uniqueAliases([trimmed, displayName]),
    };
  }

  const displayName = titleCaseWords(trimmed);
  const canonicalSlug = canonicalSlugFromPlainDisplay(displayName);
  const rawLower = trimmed.toLowerCase();
  const aliases = displayName.trim().toLowerCase() !== rawLower ? [trimmed, displayName] : [trimmed];
  return { displayName: trimInner(displayName), canonicalSlug, aliases: uniqueAliases(aliases) };
}

function uniqueAliases(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = trimInner(raw);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

export function journalistIdentityKey(brand: string, identity: Pick<NormalizedAuthorIdentity, "canonicalSlug">): string {
  return `${brand.trim().toLowerCase()}::slug::${identity.canonicalSlug.trim().toLowerCase()}`;
}

export function journalistIdentityKeyFromRaw(brand: string, raw?: string | null): string | null {
  const id = normalizeAuthorIdentity(raw ?? "", brand);
  if (!id) return null;
  return journalistIdentityKey(brand, id);
}

/**
 * Fold duplicate journalist rows that share {@link journalistIdentityKey} into one profile.
 * Assumes callers pass profiles with identical brand + identity key (all same slug).
 */
export function mergeProfilesByIdentity(profiles: LanguageJournalistProfile[]): LanguageJournalistProfile {
  if (!profiles.length) throw new Error("mergeProfilesByIdentity: empty profiles");
  const sorted = [...profiles].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const baseInit = sorted[0];
  let merged = { ...sorted[0] };
  for (const next of sorted.slice(1)) {
    merged = mergeJournalistRow(merged, next);
  }

  /** Prefer readable display name over URL-as-name stored in DB */
  const preferredNamePick =
    sorted.find((p) => !profileNameLooksLikeAuthorUrl(p.name.trim())) ??
    sorted.find((p) => normalizeAuthorIdentity(p.name, p.brand)?.displayName) ??
    sorted[0];
  const nid = normalizeAuthorIdentity(preferredNamePick.name, preferredNamePick.brand);
  merged.name = nid?.displayName ?? preferredNamePick.name.trim();
  merged.id = baseInit.id;
  merged.createdAt = baseInit.createdAt;
  merged.updatedAt =
    [...sorted.map((s) => s.updatedAt), merged.updatedAt]
      .filter(Boolean)
      .sort()
      .at(-1) ?? merged.updatedAt;
  merged.source = sorted.some((p) => p.source === "manual") ? "manual" : "imported";
  return merged;
}

export function mergeTwoJournalistDisplayNames(baseName: string, nextName: string, brand: string): string {
  const b = baseName.trim();
  const n = nextName.trim();
  const pick =
    profileNameLooksLikeAuthorUrl(b) && !profileNameLooksLikeAuthorUrl(n) ? n
    : profileNameLooksLikeAuthorUrl(n) && !profileNameLooksLikeAuthorUrl(b) ? b
    : n.length >= b.length ? n : b;
  const id = normalizeAuthorIdentity(pick, brand);
  return id?.displayName ?? pick;
}

function profileNameLooksLikeAuthorUrl(name: string): boolean {
  return /^https?:\/\//i.test(name) || /\/author\//i.test(name);
}

/** Internal merge aligned with store.mergeJournalistProfiles shape (without renaming exports). */
function mergeJournalistRow(base: LanguageJournalistProfile, next: LanguageJournalistProfile): LanguageJournalistProfile {
  const uniqueStrings = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return {
    ...base,
    ...next,
    id: base.id,
    name: preferredShortName(next.name.trim(), base.name.trim()),
    brand: next.brand || base.brand,
    sports: uniqueStrings([...(base.sports ?? []), ...(next.sports ?? [])]),
    exampleTitles: uniqueStrings([...(next.exampleTitles ?? []), ...(base.exampleTitles ?? [])]).slice(0, 12),
    sampleArticleIds: uniqueStrings([...(next.sampleArticleIds ?? []), ...(base.sampleArticleIds ?? [])]).slice(0, 20),
    styleNotes: next.styleNotes?.trim() || base.styleNotes,
    articleGuidelines: next.articleGuidelines?.trim() || base.articleGuidelines,
    authorSlug: next.authorSlug?.trim() || base.authorSlug,
    authorPageUrl: next.authorPageUrl?.trim() || base.authorPageUrl,
    bio: next.bio?.trim() || base.bio,
    avatarUrl: next.avatarUrl?.trim() || base.avatarUrl,
    socialLinks: [...(base.socialLinks ?? []), ...(next.socialLinks ?? [])].filter(
      (link, index, all) => all.findIndex((row) => row.url === link.url) === index,
    ),
    aliases: uniqueStrings([...(base.aliases ?? []), ...(next.aliases ?? [])]),
    stats: {
      importedArticleCount: Math.max(base.stats?.importedArticleCount ?? 0, next.stats?.importedArticleCount ?? 0),
      exportedArticleCount: Math.max(base.stats?.exportedArticleCount ?? 0, next.stats?.exportedArticleCount ?? 0),
      socialPostCount: Math.max(base.stats?.socialPostCount ?? 0, next.stats?.socialPostCount ?? 0),
      performanceScore: Math.max(base.stats?.performanceScore ?? 0, next.stats?.performanceScore ?? 0) || undefined,
      totalPageViews: (base.stats?.totalPageViews ?? 0) + (next.stats?.totalPageViews ?? 0) || undefined,
      totalEngagedMinutes: (base.stats?.totalEngagedMinutes ?? 0) + (next.stats?.totalEngagedMinutes ?? 0) || undefined,
      lastPerformanceImportAt: [base.stats?.lastPerformanceImportAt, next.stats?.lastPerformanceImportAt]
        .filter(Boolean)
        .sort()
        .at(-1),
    },
    teamSupportMode: next.teamSupportMode !== undefined ? next.teamSupportMode : base.teamSupportMode,
    supportedClub:
      next.teamSupportMode === "neutral" ? undefined : next.supportedClub?.trim() || base.supportedClub,
    source: base.source === "manual" || next.source === "manual" ? "manual" : "imported",
    active: next.active,
    createdAt: base.createdAt || next.createdAt,
    updatedAt: [base.updatedAt, next.updatedAt].sort().at(-1) || next.updatedAt,
  };
}

function preferredShortName(next: string, base: string): string {
  if (!next) return base;
  if (!base) return next;
  if (profileNameLooksLikeAuthorUrl(base) && !profileNameLooksLikeAuthorUrl(next)) return next;
  if (profileNameLooksLikeAuthorUrl(next) && !profileNameLooksLikeAuthorUrl(base)) return base;
  return next.length >= base.length ? next : base;
}

export function normalizeLanguageStudioArticleAuthors(data: { articles: Record<string, { author?: string; sourceBrand?: string; journalistProfileId?: string }> }): void {
  for (const article of Object.values(data.articles)) {
    const raw = article.author?.trim();
    if (!raw) continue;
    const id = normalizeAuthorIdentity(raw, article.sourceBrand ?? "");
    if (!id) continue;
    article.author = id.displayName;
  }
}
