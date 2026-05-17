import type { Metadata } from "next";

/** BCP 47 tag for UK English (screen readers, hyphenation, spell-check hints). */
export const UK_DOCUMENT_LANG = "en-GB";

/** Open Graph `locale` token for UK English. */
export const UK_OPEN_GRAPH_LOCALE = "en_GB";

/**
 * Absolute site URL for resolving relative Open Graph / Twitter image URLs.
 * Set in production so shared previews resolve correctly (optional in local dev).
 */
export function resolveOptionalMetadataBase(): URL | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
  ];
  for (const raw of candidates) {
    const t = raw?.trim();
    if (!t) continue;
    try {
      const href = t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
      return new URL(href);
    } catch {
      continue;
    }
  }
  return undefined;
}

/** UK-first defaults merged into the root layout metadata. Child routes still override `title` / `description`. */
export function ukRegionalMetadataRoot(siteName: string, description: string): Metadata {
  const metadataBase = resolveOptionalMetadataBase();
  return {
    ...(metadataBase ? { metadataBase } : {}),
    openGraph: {
      siteName,
      locale: UK_OPEN_GRAPH_LOCALE,
      type: "website",
      description,
    },
    twitter: {
      card: "summary_large_image",
      description,
    },
  };
}
