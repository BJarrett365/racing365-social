import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyRssFilters,
  applyRssTransforms,
  prepareItems,
  truncateDescription,
  truncateTitle,
} from "@/app/lib/rss-builder/apply-filters";
import { fetchRssSourceBody } from "@/app/lib/rss-builder/fetch-source";
import { looksLikeHtmlDocument, resolveBodyToRssChannel } from "@/app/lib/rss-builder/html-listing";
import { itemKeyFromLinkAndGuid } from "@/app/lib/rss-builder/slug";
import type { RssChannelItem, RssFeedRow, RssFilterConfig, RssItemStatus } from "@/app/lib/rss-builder/types";
import { defaultFilterConfig } from "@/app/lib/rss-builder/types";

function frequencyToMs(freq: string): number {
  switch (freq) {
    case "25m":
      return 25 * 60 * 1000;
    case "30m":
      return 30 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "1h":
    default:
      return 60 * 60 * 1000;
  }
}

function mergeFilterConfig(raw: unknown): RssFilterConfig {
  const base = defaultFilterConfig();
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as RssFilterConfig) };
}

async function collectXmlSources(feed: RssFeedRow): Promise<string[]> {
  if (feed.source_type === "manual_urls" && feed.manual_urls?.trim()) {
    return feed.manual_urls
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter(Boolean);
  }
  if (feed.source_url?.trim()) {
    return [feed.source_url.trim()];
  }
  throw new Error("Feed has no source URL or manual URLs.");
}

export async function runCrawlFeed(supabase: SupabaseClient, feedId: string): Promise<{ itemsUpserted: number; itemsSeen: number }> {
  const now = new Date().toISOString();
  const { data: logInsert, error: logErr } = await supabase
    .from("rss_feed_crawl_logs")
    .insert({
      feed_id: feedId,
      started_at: now,
      status: "running",
      items_seen: 0,
      items_upserted: 0,
    })
    .select("id")
    .single();
  if (logErr) throw new Error(logErr.message);
  const logId = logInsert.id as string;

  try {
    const { data: feed, error: feedErr } = await supabase.from("rss_feeds").select("*").eq("id", feedId).single();
    if (feedErr || !feed) throw new Error(feedErr?.message || "Feed not found");
    const f = feed as RssFeedRow;

    const { data: blockedRows } = await supabase.from("rss_feed_blocked_domains").select("domain").eq("feed_id", feedId);
    const blocked = new Set((blockedRows ?? []).map((r: { domain: string }) => r.domain.trim().toLowerCase()).filter(Boolean));

    const { data: filterRow } = await supabase.from("rss_feed_filters").select("config").eq("feed_id", feedId).maybeSingle();
    const filterConfig = mergeFilterConfig(filterRow?.config);

    const { data: existingItems } = await supabase.from("rss_feed_items").select("item_key,status").eq("feed_id", feedId);
    const statusByKey = new Map<string, RssItemStatus>(
      (existingItems ?? []).map((r: { item_key: string; status: RssItemStatus }) => [r.item_key, r.status]),
    );

    const urls = await collectXmlSources(f);
    const merged: RssChannelItem[] = [];
    let lastSourceBodyPrefix = "";
    const perUrlCap = Math.min(500, Math.max(1, f.posts_per_feed));
    for (const url of urls) {
      const body = await fetchRssSourceBody(url);
      lastSourceBodyPrefix = body.trim().slice(0, 400);
      const parsed = resolveBodyToRssChannel(body, url, perUrlCap);
      merged.push(...parsed.items);
    }
    const rawSeen = merged.length;

    if (rawSeen === 0) {
      const looksHtml = looksLikeHtmlDocument(lastSourceBodyPrefix);
      const hint = looksHtml
        ? "This page did not yield RSS/Atom items or extractable article links. Try a section or news index URL, or the site’s direct feed URL (.xml, /rss, /feed, atom)."
        : "No items were found in the XML. The feed may be empty, blocked, or use a format we cannot parse yet.";
      throw new Error(hint);
    }

    let prepared = prepareItems(merged);
    prepared = applyRssTransforms(prepared, filterConfig);
    prepared = applyRssFilters(prepared, filterConfig, blocked);
    prepared = prepared.slice(0, Math.min(500, Math.max(1, f.posts_per_feed)));

    const rows = prepared.map((it) => {
      const title = truncateTitle(it.title, f.limit_title_length, f.title_max_chars);
      let descriptionHtml = it.descriptionHtml;
      if (!f.enable_html_description) {
        descriptionHtml = truncateDescription(descriptionHtml, true, f.limit_description_length, f.description_max_chars);
      } else {
        descriptionHtml = truncateDescription(descriptionHtml, false, f.limit_description_length, f.description_max_chars);
      }
      let imageUrl = f.include_images ? it.imageUrl : "";
      if (!f.include_thumbnail) imageUrl = "";
      const enclosureUrl = f.include_media_enclosure ? it.enclosureUrl : "";
      const itemKey = itemKeyFromLinkAndGuid(it.link, it.guid);
      const prevStatus = statusByKey.get(itemKey);
      const status: RssItemStatus =
        prevStatus === "hidden" || prevStatus === "blocked" ? prevStatus : "visible";
      const pub = it.publishedAt;
      return {
        feed_id: feedId,
        item_key: itemKey,
        title,
        link: it.link,
        description_html: descriptionHtml,
        image_url: imageUrl?.trim() ? imageUrl.trim() : null,
        enclosure_url: enclosureUrl?.trim() ? enclosureUrl.trim() : null,
        published_at: pub,
        source_domain: it.sourceDomain || null,
        status,
      };
    });

    const { error: upsertErr } = await supabase.from("rss_feed_items").upsert(rows, { onConflict: "feed_id,item_key" });
    if (upsertErr) throw new Error(upsertErr.message);

    const next = new Date(Date.now() + frequencyToMs(f.crawl_frequency)).toISOString();
    await supabase
      .from("rss_feeds")
      .update({
        last_crawled_at: now,
        next_crawl_at: next,
        last_error: null,
        status: "active",
        updated_at: now,
      })
      .eq("id", feedId);

    await supabase
      .from("rss_feed_crawl_logs")
      .update({
        finished_at: new Date().toISOString(),
        status: "ok",
        items_seen: rawSeen,
        items_upserted: rows.length,
      })
      .eq("id", logId);

    return { itemsUpserted: rows.length, itemsSeen: rawSeen };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Crawl failed";
    await supabase.from("rss_feeds").update({ last_error: message, status: "failed", updated_at: new Date().toISOString() }).eq("id", feedId);
    await supabase
      .from("rss_feed_crawl_logs")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        error_message: message,
      })
      .eq("id", logId);
    throw e;
  }
}
