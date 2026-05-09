import type { RssChannelItem, RssFilterConfig } from "@/app/lib/rss-builder/types";

function stripHtmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function fieldMatchesApply(
  item: RssChannelItem,
  keyword: string,
  applyTo: Array<"title" | "description" | "link" | "image_url">,
): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return false;
  for (const field of applyTo) {
    if (field === "title" && item.title.toLowerCase().includes(k)) return true;
    if (field === "description" && stripHtmlToText(item.descriptionHtml).toLowerCase().includes(k)) return true;
    if (field === "link" && item.link.toLowerCase().includes(k)) return true;
    if (field === "image_url" && item.imageUrl.toLowerCase().includes(k)) return true;
  }
  return false;
}

function parsePublishedMs(raw: string): number | null {
  if (!raw.trim()) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

export type PreparedItem = RssChannelItem & {
  sourceDomain: string;
  publishedAt: string | null;
};

export function prepareItems(items: RssChannelItem[]): PreparedItem[] {
  return items.map((item) => {
    let sourceDomain = "";
    try {
      sourceDomain = new URL(item.link).hostname.toLowerCase();
    } catch {
      sourceDomain = "";
    }
    const ms = parsePublishedMs(item.publishedRaw);
    return {
      ...item,
      sourceDomain,
      publishedAt: ms ? new Date(ms).toISOString() : null,
    };
  });
}

/**
 * Apply filter config + blocked domains. Returns items that pass all enabled filters.
 */
export function applyRssFilters(
  items: PreparedItem[],
  config: RssFilterConfig,
  blockedDomains: Set<string>,
): PreparedItem[] {
  let out = items.filter((row) => !blockedDomains.has(row.sourceDomain));

  if (config.hideNoImage) {
    out = out.filter((row) => Boolean(row.imageUrl?.trim()));
  }
  if (config.hideNoDescription) {
    out = out.filter((row) => stripHtmlToText(row.descriptionHtml).length > 0);
  }
  if (config.hideNoDate) {
    out = out.filter((row) => row.publishedAt != null);
  }
  if (config.hideNoSecureLink) {
    out = out.filter((row) => /^https:\/\//i.test(row.link));
  }

  if (config.hideDuplicateTitles) {
    const seen = new Set<string>();
    out = out.filter((row) => {
      const k = row.title.trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  if (config.hideDuplicateDescriptions) {
    const seen = new Set<string>();
    out = out.filter((row) => {
      const k = stripHtmlToText(row.descriptionHtml).toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const wl = config.whitelist ?? [];
  if (wl.length > 0) {
    out = out.filter((row) =>
      wl.some((rule) => rule.keyword.trim() && fieldMatchesApply(row, rule.keyword, rule.applyTo ?? ["title", "description"])),
    );
  }
  for (const rule of config.blacklist ?? []) {
    if (!rule.keyword.trim()) continue;
    const applyTo = rule.applyTo ?? ["title", "description", "link", "image_url"];
    out = out.filter((row) => !fieldMatchesApply(row, rule.keyword, applyTo));
  }

  const hide = config.autoHideOlderThan;
  if (hide?.enabled && hide.value > 0) {
    const mult = hide.unit === "hours" ? 3600_000 : 86400_000;
    const cutoff = Date.now() - hide.value * mult;
    out = out.filter((row) => {
      const ms = row.publishedAt ? Date.parse(row.publishedAt) : null;
      if (ms == null || !Number.isFinite(ms)) return true;
      return ms >= cutoff;
    });
  }

  for (const rule of config.advancedRules ?? []) {
    if (rule.kind === "link_contains_hide" && rule.match.trim()) {
      const m = rule.match.toLowerCase();
      out = out.filter((row) => !row.link.toLowerCase().includes(m));
    }
    if (rule.kind === "domain_block" && rule.domain.trim()) {
      const d = rule.domain.trim().toLowerCase();
      out = out.filter((row) => row.sourceDomain !== d);
    }
  }

  return out;
}

/**
 * Apply replace rules and optional title cleaning (mutates copies).
 */
export function applyRssTransforms(items: PreparedItem[], config: RssFilterConfig): PreparedItem[] {
  return items.map((row) => {
    let title = row.title;
    let descriptionHtml = row.descriptionHtml;
    for (const rule of config.advancedRules ?? []) {
      if (rule.kind === "title_contains_replace" && rule.match) {
        title = title.split(rule.match).join(rule.replaceWith ?? "");
      }
      if (rule.kind === "description_contains_replace" && rule.match) {
        descriptionHtml = descriptionHtml.split(rule.match).join(rule.replaceWith ?? "");
      }
    }
    if (config.cleanTitle) {
      title = title.replace(/\s+/g, " ").trim();
    }
    if (config.removeSiteNameFromTitle && row.sourceDomain) {
      const site = row.sourceDomain.replace(/^www\./, "");
      title = title.replace(new RegExp(`\\s*[-|]\\s*${site.replace(/\./g, "\\.")}.*$`, "i"), "").trim();
    }
    return { ...row, title, descriptionHtml };
  });
}

export function truncateTitle(title: string, enabled: boolean, maxChars: number): string {
  if (!enabled || maxChars <= 0 || title.length <= maxChars) return title;
  return `${title.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

export function truncateDescription(html: string, stripHtml: boolean, enabled: boolean, maxChars: number): string {
  const plain = stripHtml ? stripHtmlToText(html) : html;
  if (!enabled || maxChars <= 0 || plain.length <= maxChars) return html;
  if (stripHtml) {
    const t = plain.slice(0, Math.max(0, maxChars - 1)).trim();
    return t ? `${t}…` : "";
  }
  return `${html.slice(0, Math.max(0, maxChars - 1))}…`;
}
