import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExportItem } from "@/app/lib/rss-builder/build-export";

export type LoadExportItemsOptions = {
  /** Match crawl `posts_per_feed` so client feeds are not larger than the configured window. */
  limit?: number;
};

function rowToExportItem(row: {
  title: string;
  link: string;
  item_key: string;
  description_html: string;
  image_url: string | null;
  enclosure_url: string | null;
  published_at: string | null;
  created_at: string;
}): ExportItem {
  const pub =
    row.published_at && Number.isFinite(Date.parse(row.published_at))
      ? new Date(row.published_at).toUTCString()
      : row.created_at && Number.isFinite(Date.parse(row.created_at))
        ? new Date(row.created_at).toUTCString()
        : new Date().toUTCString();
  return {
    title: row.title,
    link: row.link,
    guid: row.item_key,
    pubDate: pub,
    descriptionHtml: row.description_html ?? "",
    imageUrl: row.image_url,
    enclosureUrl: row.enclosure_url,
  };
}

export async function loadExportItemsForFeed(
  supabase: SupabaseClient,
  feedId: string,
  options?: LoadExportItemsOptions,
): Promise<ExportItem[]> {
  const limit = options?.limit;
  let q = supabase
    .from("rss_feed_items")
    .select("title,link,item_key,description_html,image_url,enclosure_url,published_at,created_at,pinned")
    .eq("feed_id", feedId)
    .eq("status", "visible")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false });
  if (limit != null && Number.isFinite(limit) && limit > 0) {
    q = q.limit(Math.min(500, Math.floor(limit)));
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return rows.map((r) =>
    rowToExportItem(r as {
      title: string;
      link: string;
      item_key: string;
      description_html: string;
      image_url: string | null;
      enclosure_url: string | null;
      published_at: string | null;
      created_at: string;
    }),
  );
}

export async function loadExportItemsForBundle(
  supabase: SupabaseClient,
  bundleId: string,
  options?: LoadExportItemsOptions,
): Promise<ExportItem[]> {
  const { data: links, error: lerr } = await supabase.from("rss_bundle_feeds").select("feed_id").eq("bundle_id", bundleId);
  if (lerr) throw new Error(lerr.message);
  const feedIds = (links ?? []).map((r: { feed_id: string }) => r.feed_id);
  if (feedIds.length === 0) return [];
  const { data, error } = await supabase
    .from("rss_feed_items")
    .select("title,link,item_key,description_html,image_url,enclosure_url,published_at,created_at,pinned")
    .in("feed_id", feedIds)
    .eq("status", "visible");
  if (error) throw new Error(error.message);
  const byLink = new Map<string, ExportItem>();
  for (const r of data ?? []) {
    const item = rowToExportItem(r as {
      title: string;
      link: string;
      item_key: string;
      description_html: string;
      image_url: string | null;
      enclosure_url: string | null;
      published_at: string | null;
      created_at: string;
    });
    const k = item.link.trim().toLowerCase();
    if (!byLink.has(k)) byLink.set(k, item);
  }
  const sorted = [...byLink.values()].sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  const cap =
    options?.limit != null && Number.isFinite(options.limit) && options.limit > 0
      ? Math.min(500, Math.floor(options.limit))
      : 500;
  return sorted.slice(0, cap);
}
