"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { normalizeBundleNameKey } from "@/app/lib/rss-builder/bundle-name";
import { resolvePreviewImageUrl } from "@/app/lib/rss-builder/preview-image";
import { defaultFilterConfig, type RssCrawlFrequency, type RssFeedRow, type RssFeedSourceType, type RssFilterConfig, type RssTranslationProvider } from "@/app/lib/rss-builder/types";

type RssBundleRow = {
  id: string;
  slug: string;
  export_token: string;
  name: string;
  starred: boolean;
  created_at: string;
  updated_at: string;
};

type RssFeedItemRow = {
  id: string;
  feed_id: string;
  title: string;
  link: string;
  description_html: string;
  image_url: string | null;
  enclosure_url: string | null;
  published_at: string | null;
  source_domain: string | null;
  status: "visible" | "hidden" | "blocked";
  pinned: boolean;
  created_at?: string;
};

type FeedFiltersRow = { feed_id: string; config: RssFilterConfig; updated_at: string };
type TranslationRow = {
  feed_id: string;
  enabled: boolean;
  from_lang: string;
  to_lang: string;
  provider: RssTranslationProvider;
};

type Tab = "overview" | "preview" | "output" | "filters" | "translation" | "bundle";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...(init?.headers as Record<string, string> | undefined) };
  if (init?.method && init.method !== "GET" && !("Content-Type" in (headers as object))) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { credentials: "include", ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

/** Renders API hints that use `**bold**` and `` `code` `` markers. */
function renderRssInlineSegment(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[color:var(--accent-foreground)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="break-all rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-1.5 py-0.5 font-mono text-[0.8125rem] font-medium text-[color:var(--text-secondary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderRssInlineSegmentError(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[color:var(--danger)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="break-all rounded-md border border-[color:color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color:var(--surface)] px-1.5 py-0.5 font-mono text-[0.8125rem] font-medium text-[color:var(--text-secondary)] shadow-sm"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function RssFlashBanner({ kind, text }: { kind: "success" | "error"; text: string }) {
  const shell =
    kind === "success"
      ? "border-[color:var(--border-strong)] bg-[color:var(--accent-soft)] text-[color:var(--text-primary)] shadow-sm"
      : "border-[color:color-mix(in_srgb,var(--danger)_42%,var(--border))] bg-[color:var(--danger-soft)] text-[color:var(--text-primary)] shadow-sm";
  const paragraphs = text.split(/\n\n+/).filter((p) => p.length > 0);
  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3.5 font-sans text-[0.9375rem] font-normal leading-relaxed tracking-normal antialiased [&_p]:text-[color:var(--text-primary)] ${shell}`}
    >
      {paragraphs.map((para, i) => (
        <p key={i} className={i > 0 ? "mt-3 text-[color:var(--text-primary)]" : "text-[color:var(--text-primary)]"}>
          {kind === "error" ? renderRssInlineSegmentError(para) : renderRssInlineSegment(para)}
        </p>
      ))}
    </div>
  );
}

function publicExportBase(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/rss-builder/public`;
}

function feedSourceUrlCount(feed: RssFeedRow): number {
  return splitFeedSourceUrls(feed.source_url).length + splitFeedSourceUrls(feed.manual_urls).length;
}

function stripHtmlSnippet(html: string, maxLen: number): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

function formatPublishedAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatAbsoluteTimestamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function previewPrimaryTimestamp(item: RssFeedItemRow): { iso: string | null; absolute: string; relative: string } {
  const pub = item.published_at;
  const created = item.created_at;
  const pubOk = pub && Number.isFinite(new Date(pub).getTime());
  const useIso = pubOk ? pub : created && Number.isFinite(new Date(created).getTime()) ? created : null;
  if (!useIso) return { iso: null, absolute: "No publish date", relative: "" };
  return {
    iso: useIso,
    absolute: formatAbsoluteTimestamp(useIso),
    relative: formatPublishedAgo(useIso),
  };
}

export default function RssImportBuilderClient() {
  const [feeds, setFeeds] = useState<RssFeedRow[]>([]);
  const [bundles, setBundles] = useState<RssBundleRow[]>([]);
  const [kind, setKind] = useState<"feed" | "bundle">("feed");
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [feedDetail, setFeedDetail] = useState<{
    feed: RssFeedRow;
    items: RssFeedItemRow[];
    filters: FeedFiltersRow | null;
    translation: TranslationRow | null;
  } | null>(null);
  const [bundleFeedIds, setBundleFeedIds] = useState<string[]>([]);
  const [filterDraft, setFilterDraft] = useState<RssFilterConfig>(defaultFilterConfig());
  const [translationDraft, setTranslationDraft] = useState({
    enabled: false,
    from_lang: "auto",
    to_lang: "en",
    provider: "deepl" as RssTranslationProvider,
  });
  const [feedFormDraft, setFeedFormDraft] = useState<Partial<RssFeedRow>>({});
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedSources, setNewFeedSources] = useState("");
  const [newFeedSourceType, setNewFeedSourceType] = useState<RssFeedSourceType>("rss_url");
  const [newBundleName, setNewBundleName] = useState("");
  const [blockDomain, setBlockDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedBundle = useMemo(
    () => bundles.find((b) => b.id === selectedBundleId) ?? null,
    [bundles, selectedBundleId],
  );

  const newBundleNameTaken = useMemo(() => {
    const key = normalizeBundleNameKey(newBundleName);
    if (!key) return false;
    return bundles.some((b) => normalizeBundleNameKey(b.name) === key);
  }, [bundles, newBundleName]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadList = useCallback(() => {
    return run(async () => {
      const data = await apiJson<{ feeds: RssFeedRow[]; bundles: RssBundleRow[] }>("/api/rss-builder/feeds");
      setFeeds(data.feeds);
      setBundles(data.bundles);
    });
  }, [run]);

  type FeedDetailPayload = {
    feed: RssFeedRow;
    items: RssFeedItemRow[];
    filters: FeedFiltersRow | null;
    translation: TranslationRow | null;
  };

  const ingestFeedDetail = useCallback((data: FeedDetailPayload) => {
    setFeedDetail(data);
    setFilterDraft(data.filters?.config ?? defaultFilterConfig());
    if (data.translation) {
      setTranslationDraft({
        enabled: data.translation.enabled,
        from_lang: data.translation.from_lang,
        to_lang: data.translation.to_lang,
        provider: data.translation.provider,
      });
    } else {
      setTranslationDraft({ enabled: false, from_lang: "auto", to_lang: "en", provider: "deepl" });
    }
    setFeedFormDraft(data.feed);
  }, []);

  const loadFeed = useCallback(
    (id: string) =>
      run(async () => {
        const data = await apiJson<FeedDetailPayload>(`/api/rss-builder/feeds/${id}`);
        ingestFeedDetail(data);
      }),
    [run, ingestFeedDetail],
  );

  const loadBundle = useCallback(
    (id: string) =>
      run(async () => {
        const data = await apiJson<{ bundle: RssBundleRow; feedIds: string[] }>(`/api/rss-builder/bundles/${id}`);
        setBundles((prev) => {
          const rest = prev.filter((b) => b.id !== data.bundle.id);
          return [data.bundle, ...rest];
        });
        setBundleFeedIds(data.feedIds);
      }),
    [run],
  );

  const openBundleEditor = (id: string) => {
    setKind("bundle");
    setSelectedBundleId(id);
    setSelectedFeedId(null);
    setTab("bundle");
  };

  const deleteBundle = (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete bundle “${name}”? This permanently removes the bundle and which feeds were attached. Feed data is not deleted.`,
      )
    ) {
      return;
    }
    void run(async () => {
      await apiJson<{ success: boolean }>(`/api/rss-builder/bundles/${id}`, { method: "DELETE" });
      setBundles((rows) => rows.filter((b) => b.id !== id));
      if (selectedBundleId === id) {
        setSelectedBundleId(null);
        setBundleFeedIds([]);
      }
      setMessage("Bundle deleted.");
      await loadList();
    });
  };

  const deleteFeed = (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete feed “${name}”? This permanently removes the feed, its items, filters, and crawl history. Bundles that included it will drop the link.`,
      )
    ) {
      return;
    }
    void run(async () => {
      await apiJson<{ success: boolean }>(`/api/rss-builder/feeds/${id}`, { method: "DELETE" });
      setFeeds((rows) => rows.filter((f) => f.id !== id));
      setBundleFeedIds((ids) => ids.filter((x) => x !== id));
      if (selectedFeedId === id) {
        setSelectedFeedId(null);
        setFeedDetail(null);
      }
      setMessage("Feed deleted.");
      await loadList();
    });
  };

  const openFeedEditor = (id: string) => {
    setKind("feed");
    setSelectedFeedId(id);
    setSelectedBundleId(null);
    setTab("overview");
  };

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (kind === "feed" && selectedFeedId) void loadFeed(selectedFeedId);
    else setFeedDetail(null);
  }, [kind, selectedFeedId, loadFeed]);

  useEffect(() => {
    if (kind === "bundle" && selectedBundleId) void loadBundle(selectedBundleId);
    else setBundleFeedIds([]);
  }, [kind, selectedBundleId, loadBundle]);

  const exportUrls = useMemo(() => {
    const base = publicExportBase();
    if (!base) return { rss: "", xml: "", json: "" };
    if (kind === "feed" && feedDetail?.feed) {
      const { slug, export_token: token } = feedDetail.feed;
      const encSlug = encodeURIComponent(slug);
      const encTok = encodeURIComponent(token);
      return {
        rss: `${base}/${encSlug}?token=${encTok}&format=rss`,
        xml: `${base}/${encSlug}?token=${encTok}&format=xml`,
        json: `${base}/${encSlug}?token=${encTok}&format=json`,
      };
    }
    if (kind === "bundle" && selectedBundle) {
      const { slug, export_token: token } = selectedBundle;
      const encSlug = encodeURIComponent(slug);
      const encTok = encodeURIComponent(token);
      return {
        rss: `${base}/${encSlug}?token=${encTok}&format=rss`,
        xml: `${base}/${encSlug}?token=${encTok}&format=xml`,
        json: `${base}/${encSlug}?token=${encTok}&format=json`,
      };
    }
    return { rss: "", xml: "", json: "" };
  }, [kind, feedDetail, selectedBundle]);

  const createFeed = () =>
    run(async () => {
      if (!newFeedName.trim() || !newFeedSources.trim()) throw new Error("Name and at least one source URL are required.");
      const body =
        newFeedSourceType === "manual_urls"
          ? {
              name: newFeedName.trim(),
              source_type: "manual_urls" as const,
              source_url: null,
              manual_urls: newFeedSources.trim(),
            }
          : {
              name: newFeedName.trim(),
              source_type: newFeedSourceType,
              source_url: newFeedSources.trim(),
              manual_urls: null,
            };
      const data = await apiJson<{ feed: RssFeedRow }>("/api/rss-builder/feeds", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewFeedName("");
      setNewFeedSources("");
      setNewFeedSourceType("rss_url");
      setFeeds((rows) => [data.feed, ...rows]);
      setKind("feed");
      setSelectedFeedId(data.feed.id);
      setTab("overview");
      setMessage("Feed created. Run a crawl to pull items.");
    });

  const createBundle = () =>
    run(async () => {
      if (!newBundleName.trim()) throw new Error("Bundle name is required.");
      const data = await apiJson<{ bundle: RssBundleRow }>("/api/rss-builder/bundles", {
        method: "POST",
        body: JSON.stringify({ name: newBundleName.trim() }),
      });
      setNewBundleName("");
      setBundles((rows) => [data.bundle, ...rows]);
      setKind("bundle");
      setSelectedBundleId(data.bundle.id);
      setBundleFeedIds([]);
      setTab("bundle");
      setMessage("Bundle created. Attach feeds below.");
    });

  const crawl = () =>
    run(async () => {
      if (!selectedFeedId) return;
      const id = selectedFeedId;
      try {
        await apiJson(`/api/rss-builder/feeds/${id}/crawl`, { method: "POST", body: JSON.stringify({}) });
        setMessage("Crawl finished.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
      try {
        const data = await apiJson<FeedDetailPayload>(`/api/rss-builder/feeds/${id}`);
        ingestFeedDetail(data);
        const list = await apiJson<{ feeds: RssFeedRow[]; bundles: RssBundleRow[] }>("/api/rss-builder/feeds");
        setFeeds(list.feeds);
        setBundles(list.bundles);
      } catch {
        /* ignore secondary load errors */
      }
    });

  const saveFeedFields = () =>
    run(async () => {
      if (!selectedFeedId) return;
      const body = {
        name: feedFormDraft.name,
        source_type: feedFormDraft.source_type,
        source_url: feedFormDraft.source_url,
        manual_urls: feedFormDraft.manual_urls,
        crawl_frequency: feedFormDraft.crawl_frequency,
        posts_per_feed: feedFormDraft.posts_per_feed,
        include_images: feedFormDraft.include_images,
        include_media_enclosure: feedFormDraft.include_media_enclosure,
        use_fallback_image: feedFormDraft.use_fallback_image,
        include_thumbnail: feedFormDraft.include_thumbnail,
        include_all_images: feedFormDraft.include_all_images,
        include_videos: feedFormDraft.include_videos,
        enable_html_description: feedFormDraft.enable_html_description,
        limit_title_length: feedFormDraft.limit_title_length,
        title_max_chars: feedFormDraft.title_max_chars,
        limit_description_length: feedFormDraft.limit_description_length,
        description_max_chars: feedFormDraft.description_max_chars,
      };
      const data = await apiJson<{ feed: RssFeedRow }>(`/api/rss-builder/feeds/${selectedFeedId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setFeedDetail((d) => (d ? { ...d, feed: data.feed } : d));
      setFeeds((rows) => rows.map((f) => (f.id === data.feed.id ? data.feed : f)));
      setMessage("Feed settings saved.");
    });

  const saveFilters = () =>
    run(async () => {
      if (!selectedFeedId) return;
      await apiJson(`/api/rss-builder/feeds/${selectedFeedId}/filters`, {
        method: "PATCH",
        body: JSON.stringify({ config: filterDraft }),
      });
      setMessage("Filters saved. Crawl again to re-apply to stored items where applicable.");
    });

  const saveTranslation = () =>
    run(async () => {
      if (!selectedFeedId) return;
      await apiJson(`/api/rss-builder/feeds/${selectedFeedId}/translation`, {
        method: "PATCH",
        body: JSON.stringify(translationDraft),
      });
      setMessage("Translation settings saved.");
    });

  const postBlockDomain = () =>
    run(async () => {
      if (!selectedFeedId || !blockDomain.trim()) return;
      await apiJson(`/api/rss-builder/feeds/${selectedFeedId}/block-domain`, {
        method: "POST",
        body: JSON.stringify({ domain: blockDomain.trim() }),
      });
      setBlockDomain("");
      setMessage("Domain blocked and matching items updated.");
      await loadFeed(selectedFeedId);
    });

  const setItemStatus = (itemId: string, status: RssFeedItemRow["status"]) =>
    run(async () => {
      await apiJson(`/api/rss-builder/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setFeedDetail((d) =>
        d
          ? {
              ...d,
              items: d.items.map((it) => (it.id === itemId ? { ...it, status } : it)),
            }
          : d,
      );
    });

  const toggleFeedInBundle = (feedId: string, attach: boolean) =>
    run(async () => {
      if (!selectedBundleId) return;
      await apiJson(`/api/rss-builder/bundles/${selectedBundleId}/feeds`, {
        method: "POST",
        body: JSON.stringify({ feed_id: feedId, detach: !attach }),
      });
      setBundleFeedIds((ids) => {
        if (attach) return ids.includes(feedId) ? ids : [...ids, feedId];
        return ids.filter((x) => x !== feedId);
      });
      setMessage(attach ? "Feed attached to bundle." : "Feed detached from bundle.");
    });

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const itemsPreview = (feedDetail?.items ?? []).slice(0, 80);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link href="/tools">
          <R365Button variant="ghost">Back to Tools</R365Button>
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-[#2d214a] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.2),transparent_40%),#0b1020] px-6 py-10 shadow-2xl md:px-10 md:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Tools / Import</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">RSS Import Builder</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
          Point at one or many RSS/Atom or HTML news URLs (one per line per feed); we crawl, merge, store in Supabase, and create a stable RSS or JSON feed for that bundle — filtered, deduped export URLs for Language Studio or any reader. No widgets, only endpoints.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/language-studio?tab=Imports">
            <R365Button variant="ghost">Open Language Studio imports</R365Button>
          </Link>
        </div>
      </section>

      {message ? <RssFlashBanner kind="success" text={message} /> : null}
      {error ? <RssFlashBanner kind="error" text={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <Panel title="Feeds">
            <div className="space-y-2">
              {feeds.map((f) => (
                <div
                  key={f.id}
                  className={`flex overflow-hidden rounded-lg border transition ${
                    kind === "feed" && selectedFeedId === f.id
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-[color:var(--border)] bg-[color:var(--surface-muted)] hover:border-emerald-500/40"
                  }`}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openFeedEditor(f.id)}
                    className={`flex min-w-0 flex-1 flex-col px-3 py-2 text-left text-sm transition ${
                      kind === "feed" && selectedFeedId === f.id
                        ? "text-white"
                        : "text-[color:var(--text-primary)]"
                    }`}
                  >
                    <span className="font-semibold">{f.name}</span>
                    <span
                      className={`text-xs ${
                        kind === "feed" && selectedFeedId === f.id ? "text-emerald-100/90" : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      {f.status}
                    </span>
                    {feedSourceUrlCount(f) > 0 ? (
                      <span
                        className={`text-[10px] ${
                          kind === "feed" && selectedFeedId === f.id ? "text-emerald-100/80" : "text-[color:var(--text-muted)]"
                        }`}
                      >
                        {feedSourceUrlCount(f)} source URL{feedSourceUrlCount(f) === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-[color:var(--border)] bg-[color:var(--surface)]/60 py-1 pl-1 pr-1">
                    <button
                      type="button"
                      disabled={busy}
                      title="Edit feed"
                      onClick={(e) => {
                        e.preventDefault();
                        openFeedEditor(f.id);
                      }}
                      className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="Delete feed"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteFeed(f.id, f.name);
                      }}
                      className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 hover:bg-red-500/10 dark:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {feeds.length === 0 ? <p className="text-xs text-[color:var(--text-muted)]">No feeds yet.</p> : null}
            </div>
            <div className="mt-4 space-y-2 border-t border-[color:var(--border)] pt-4">
              <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">New feed</p>
              <input
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                placeholder="Display name"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
              />
              <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                Source type
                <select
                  className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                  value={newFeedSourceType}
                  onChange={(e) => setNewFeedSourceType(e.target.value as RssFeedSourceType)}
                >
                  <option value="xml_feed">XML feed — RSS 2.0 / Atom URLs only</option>
                  <option value="rss_url">RSS / Atom or HTML (smart, one or more URLs)</option>
                  <option value="site_url">Site / HTML listing (one or more URLs)</option>
                  <option value="manual_urls">Manual URL list only</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                {newFeedSourceType === "manual_urls" ? "URLs (one per line)" : "Source URLs (one per line)"}
                <textarea
                  className="mt-1 min-h-[5.5rem] w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs"
                  placeholder={
                    newFeedSourceType === "xml_feed"
                      ? "https://www.example.com/news/feed.xml\nhttps://partner.example.com/atom.xml"
                      : "https://example.com/feed.xml\nhttps://other.com/racing/news"
                  }
                  value={newFeedSources}
                  onChange={(e) => setNewFeedSources(e.target.value)}
                />
                <p className="mt-1 text-[11px] font-normal normal-case text-[color:var(--text-muted)]">
                  Each line is crawled in order; items are merged into this single RSS/JSON export (deduped by link).
                </p>
              </label>
              <div className="w-full [&>button]:w-full">
                <R365Button disabled={busy} onClick={() => void createFeed()}>
                  Create feed
                </R365Button>
              </div>
            </div>
          </Panel>

          <Panel title="Bundles">
            <div className="space-y-2">
              {bundles.map((b) => (
                <div
                  key={b.id}
                  className={`flex overflow-hidden rounded-lg border transition ${
                    kind === "bundle" && selectedBundleId === b.id
                      ? "border-violet-500/60 bg-violet-500/10"
                      : "border-[color:var(--border)] bg-[color:var(--surface-muted)] hover:border-violet-500/40"
                  }`}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openBundleEditor(b.id)}
                    className={`flex min-w-0 flex-1 flex-col px-3 py-2 text-left text-sm transition ${
                      kind === "bundle" && selectedBundleId === b.id
                        ? "text-[color:var(--text-primary)]"
                        : "text-[color:var(--text-primary)]"
                    }`}
                  >
                    <span className="font-semibold">{b.name}</span>
                  </button>
                  <div className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-[color:var(--border)] bg-[color:var(--surface)]/60 py-1 pl-1 pr-1">
                    <button
                      type="button"
                      disabled={busy}
                      title="Edit bundle"
                      onClick={(e) => {
                        e.preventDefault();
                        openBundleEditor(b.id);
                      }}
                      className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-500/15 dark:text-violet-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="Delete bundle"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteBundle(b.id, b.name);
                      }}
                      className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 hover:bg-red-500/10 dark:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {bundles.length === 0 ? <p className="text-xs text-[color:var(--text-muted)]">No bundles yet.</p> : null}
            </div>
            <div className="mt-4 space-y-2 border-t border-[color:var(--border)] pt-4">
              <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">New bundle</p>
              <input
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                placeholder="Bundle name"
                value={newBundleName}
                onChange={(e) => setNewBundleName(e.target.value)}
              />
              {newBundleNameTaken ? (
                <p className="text-xs text-amber-700 dark:text-amber-200/90">
                  A bundle with this name already exists (comparison ignores spaces and letter case).
                </p>
              ) : null}
              <div className="w-full [&>button]:w-full">
                <R365Button disabled={busy || newBundleNameTaken || !newBundleName.trim()} onClick={() => void createBundle()}>
                  Create bundle
                </R365Button>
              </div>
            </div>
          </Panel>
        </aside>

        <main className="space-y-4">
          {kind === "feed" && feedDetail ? (
            <>
              <div className="flex flex-wrap gap-2 border-b border-[color:var(--border)] pb-3">
                {(["overview", "preview", "output", "filters", "translation"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
                      tab === t ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200" : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    {t === "output"
                      ? "Feed output"
                      : t === "preview"
                        ? "Preview"
                        : t === "overview"
                          ? "Overview"
                          : t === "filters"
                            ? "Filters"
                            : "Translation"}
                  </button>
                ))}
              </div>

              {tab === "overview" ? (
                <div className="space-y-4">
                  <Panel title="Feed & crawl">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                        Name
                        <input
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                          value={(feedFormDraft.name as string) ?? ""}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, name: e.target.value }))}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                        Source type
                        <select
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                          value={(feedFormDraft.source_type as RssFeedSourceType) ?? "rss_url"}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, source_type: e.target.value as RssFeedSourceType }))}
                        >
                          <option value="xml_feed">XML feed (RSS 2.0 / Atom only)</option>
                          <option value="rss_url">RSS / smart (XML or HTML)</option>
                          <option value="manual_urls">Manual URLs</option>
                          <option value="site_url">Site URL</option>
                          <option value="sitemap">Sitemap</option>
                          <option value="topic">Topic</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)] md:col-span-2">
                        Source URL(s)
                        <textarea
                          className="mt-1 min-h-[5.5rem] w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs"
                          placeholder={
                            (feedFormDraft.source_type as RssFeedSourceType | undefined) === "xml_feed"
                              ? "https://www.example.com/feed.xml\nhttps://cdn.example.com/partner-feed.atom"
                              : "https://www.example.com/feed\nhttps://www.other.com/news"
                          }
                          value={(feedFormDraft.source_url as string) ?? ""}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, source_url: e.target.value }))}
                        />
                        <p className="mt-1.5 text-xs font-normal normal-case text-[color:var(--text-muted)]">
                          {(feedFormDraft.source_type as RssFeedSourceType | undefined) === "xml_feed" ? (
                            <>
                              Each line must return <strong className="text-[color:var(--text-secondary)]">RSS 2.0 or Atom XML</strong> (direct{" "}
                              <code className="rounded bg-[color:var(--surface-muted)] px-1">.xml</code>,{" "}
                              <code className="rounded bg-[color:var(--surface-muted)] px-1">/feed</code>,{" "}
                              <code className="rounded bg-[color:var(--surface-muted)] px-1">/rss</code>, etc.). HTML pages are rejected for this type.
                              Optional <strong className="text-[color:var(--text-secondary)]">Manual URLs</strong> below are merged on each crawl.
                            </>
                          ) : (
                            <>
                              One URL per line for multiple feeds or listing pages; crawls are merged into this export (deduped by link). RSS/Atom and HTML rules apply per URL. Optional{" "}
                              <strong className="text-[color:var(--text-secondary)]">Manual URLs</strong> below are also crawled for RSS and site types.
                            </>
                          )}
                        </p>
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)] md:col-span-2">
                        Manual URLs (optional, one per line)
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs"
                          value={(feedFormDraft.manual_urls as string) ?? ""}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, manual_urls: e.target.value }))}
                        />
                        <p className="mt-1 text-[11px] font-normal normal-case text-[color:var(--text-muted)]">
                          For <strong className="text-[color:var(--text-secondary)]">Manual URLs</strong> source type, only this box is used (or Source URL(s) if this is empty). For other types, lines here are merged with Source URL(s) on each crawl.
                        </p>
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                        Crawl frequency
                        <select
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                          value={(feedFormDraft.crawl_frequency as RssCrawlFrequency) ?? "1h"}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, crawl_frequency: e.target.value as RssCrawlFrequency }))}
                        >
                          <option value="25m">25m</option>
                          <option value="30m">30m</option>
                          <option value="1h">1h</option>
                          <option value="24h">24h</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <R365Button disabled={busy} onClick={() => void saveFeedFields()}>
                        Save feed
                      </R365Button>
                      <R365Button disabled={busy} onClick={() => void crawl()}>
                        Run crawl now
                      </R365Button>
                      <R365Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => deleteFeed(feedDetail.feed.id, feedDetail.feed.name)}
                      >
                        Delete feed
                      </R365Button>
                    </div>
                    <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
                      Use <strong className="text-[color:var(--text-secondary)]">Preview</strong> for card-style RSS view and{" "}
                      <strong className="text-[color:var(--text-secondary)]">Feed output</strong> for media, HTML, and length settings.
                    </p>
                    <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                      Last crawl: {feedDetail.feed.last_crawled_at ? new Date(feedDetail.feed.last_crawled_at).toLocaleString() : "—"}
                      {" · "}
                      Next: {feedDetail.feed.next_crawl_at ? new Date(feedDetail.feed.next_crawl_at).toLocaleString() : "—"}
                    </p>
                    {feedDetail.feed.last_error?.trim() ? (
                      <div className="mt-3">
                        <RssFlashBanner kind="error" text={feedDetail.feed.last_error} />
                      </div>
                    ) : null}
                  </Panel>

                  <Panel title="Block domain">
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Adds the domain to the block list and marks existing items from that host as blocked.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        className="min-w-[200px] flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                        placeholder="example.com"
                        value={blockDomain}
                        onChange={(e) => setBlockDomain(e.target.value)}
                      />
                      <R365Button disabled={busy || !blockDomain.trim()} onClick={() => void postBlockDomain()}>
                        Block
                      </R365Button>
                    </div>
                  </Panel>

                  <Panel title={`Items (${feedDetail.items.length})`}>
                    <div className="max-h-[420px] overflow-auto rounded-lg border border-[color:var(--border)]">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[color:var(--surface-muted)]">
                          <tr>
                            <th className="p-2">Title</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsPreview.map((it) => (
                            <tr key={it.id} className="border-t border-[color:var(--border)]">
                              <td className="p-2">
                                <a href={it.link} target="_blank" rel="noreferrer" className="font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                                  {it.title || "(no title)"}
                                </a>
                                <div className="text-[color:var(--text-muted)]">{it.source_domain}</div>
                              </td>
                              <td className="p-2">
                                <select
                                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1"
                                  value={it.status}
                                  onChange={(e) => void setItemStatus(it.id, e.target.value as RssFeedItemRow["status"])}
                                >
                                  <option value="visible">visible</option>
                                  <option value="hidden">hidden</option>
                                  <option value="blocked">blocked</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {feedDetail.items.length > itemsPreview.length ? (
                      <p className="mt-2 text-xs text-[color:var(--text-muted)]">Showing first {itemsPreview.length} rows.</p>
                    ) : null}
                  </Panel>
                </div>
              ) : null}

              {tab === "preview" ? (
                <div className="space-y-4">
                  <Panel title="RSS preview">
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Card view of <strong className="text-[color:var(--text-secondary)]">visible</strong> items (how readers see headlines, images, and snippets). Use the button to open the live RSS in a new tab.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exportUrls.rss ? (
                        <>
                          <a
                            href={exportUrls.rss}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[color:var(--text-primary)]"
                            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                          >
                            Open RSS preview
                          </a>
                          <R365Button variant="ghost" onClick={() => void copyText(exportUrls.rss)}>
                            Copy feed URL
                          </R365Button>
                        </>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {feedDetail.items
                        .filter((i) => i.status === "visible")
                        .slice(0, 4)
                        .map((it) => {
                          const previewImg = resolvePreviewImageUrl(it);
                          const ts = previewPrimaryTimestamp(it);
                          return (
                          <article
                            key={it.id}
                            className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm"
                          >
                            {previewImg ? (
                              <a href={it.link} target="_blank" rel="noreferrer" className="block aspect-video w-full bg-[color:var(--surface-muted)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previewImg}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              </a>
                            ) : (
                              <div className="flex aspect-video items-center justify-center bg-[color:var(--surface-muted)] text-xs text-[color:var(--text-muted)]">
                                No image
                              </div>
                            )}
                            <div className="space-y-2 p-4">
                              <h3 className="text-sm font-bold leading-snug text-[color:var(--text-primary)]">
                                <a href={it.link} target="_blank" rel="noreferrer" className="hover:underline">
                                  {it.title || "(no title)"}
                                </a>
                              </h3>
                              <p className="text-xs leading-relaxed text-[color:var(--text-secondary)]">
                                {stripHtmlSnippet(it.description_html, 220)}
                              </p>
                              <div className="space-y-1 text-[11px] text-[color:var(--text-muted)]">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span>{it.source_domain ?? "—"}</span>
                                </div>
                                <div className="font-medium text-[color:var(--text-secondary)]">
                                  {ts.iso ? (
                                    <time dateTime={ts.iso}>
                                      {ts.absolute}
                                      {ts.relative ? <span className="font-normal text-[color:var(--text-muted)]"> · {ts.relative}</span> : null}
                                    </time>
                                  ) : (
                                    <span>{ts.absolute}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                        })}
                    </div>
                    {feedDetail.items.filter((i) => i.status === "visible").length === 0 ? (
                      <p className="mt-4 text-sm text-[color:var(--text-muted)]">No visible items yet — run a crawl or unhide items.</p>
                    ) : null}
                  </Panel>
                </div>
              ) : null}

              {tab === "output" ? (
                <div className="space-y-4">
                  <Panel title="Customize feed output">
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Same class of controls as dedicated RSS builders: posts cap, media in RSS, title/description limits, and HTML descriptions — applied on export and crawl storage.
                    </p>
                    <div className="mt-4 grid max-w-3xl gap-4 md:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)] md:col-span-2">
                        Posts per feed (max stored)
                        <input
                          type="number"
                          min={1}
                          max={500}
                          className="mt-1 w-full max-w-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                          value={feedFormDraft.posts_per_feed ?? 50}
                          onChange={(e) =>
                            setFeedFormDraft((d) => ({ ...d, posts_per_feed: Number.parseInt(e.target.value, 10) || 50 }))
                          }
                        />
                      </label>

                      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4 md:col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Images &amp; media</p>
                        <div className="mt-3 space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(feedFormDraft.include_images)}
                              onChange={(e) => setFeedFormDraft((d) => ({ ...d, include_images: e.target.checked }))}
                            />
                            Include images in the media
                          </label>
                          <p className="text-[11px] leading-snug text-[color:var(--text-muted)]">
                            Saves remote image URLs for card preview and RSS output only. Images are not imported into the Library.
                          </p>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(feedFormDraft.include_media_enclosure)}
                              onChange={(e) => setFeedFormDraft((d) => ({ ...d, include_media_enclosure: e.target.checked }))}
                            />
                            Include media enclosure
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(feedFormDraft.use_fallback_image)}
                              onChange={(e) => setFeedFormDraft((d) => ({ ...d, use_fallback_image: e.target.checked }))}
                            />
                            Use fallback image if missing
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(feedFormDraft.include_thumbnail)}
                              onChange={(e) => setFeedFormDraft((d) => ({ ...d, include_thumbnail: e.target.checked }))}
                            />
                            Include thumbnail in description
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(feedFormDraft.include_all_images)}
                              onChange={(e) => setFeedFormDraft((d) => ({ ...d, include_all_images: e.target.checked }))}
                            />
                            Include all images in description
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(feedFormDraft.include_videos)}
                              onChange={(e) => setFeedFormDraft((d) => ({ ...d, include_videos: e.target.checked }))}
                            />
                            Include videos (enclosure)
                          </label>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4 md:col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Title</p>
                        <label className="mt-3 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(feedFormDraft.limit_title_length)}
                            onChange={(e) => setFeedFormDraft((d) => ({ ...d, limit_title_length: e.target.checked }))}
                          />
                          Limit title length
                        </label>
                        <label className="mt-2 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                          Max characters
                          <input
                            type="number"
                            min={10}
                            max={500}
                            disabled={!feedFormDraft.limit_title_length}
                            className="mt-1 w-full max-w-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm disabled:opacity-50"
                            value={feedFormDraft.title_max_chars ?? 100}
                            onChange={(e) =>
                              setFeedFormDraft((d) => ({ ...d, title_max_chars: Number.parseInt(e.target.value, 10) || 100 }))
                            }
                          />
                        </label>
                      </div>

                      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/40 p-4 md:col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Description</p>
                        <label className="mt-3 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(feedFormDraft.enable_html_description)}
                            onChange={(e) => setFeedFormDraft((d) => ({ ...d, enable_html_description: e.target.checked }))}
                          />
                          Enable HTML in description
                        </label>
                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(feedFormDraft.limit_description_length)}
                            onChange={(e) => setFeedFormDraft((d) => ({ ...d, limit_description_length: e.target.checked }))}
                          />
                          Limit description length
                        </label>
                        <label className="mt-2 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                          Max characters
                          <input
                            type="number"
                            min={20}
                            max={20000}
                            disabled={!feedFormDraft.limit_description_length}
                            className="mt-1 w-full max-w-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm disabled:opacity-50"
                            value={feedFormDraft.description_max_chars ?? 200}
                            onChange={(e) =>
                              setFeedFormDraft((d) => ({
                                ...d,
                                description_max_chars: Number.parseInt(e.target.value, 10) || 200,
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="mt-6">
                      <R365Button disabled={busy} onClick={() => void saveFeedFields()}>
                        Save output settings
                      </R365Button>
                    </div>
                  </Panel>
                </div>
              ) : null}

              {tab === "filters" ? (
                <Panel title="Filter config">
                  <div className="grid gap-3 md:grid-cols-2">
                    {(
                      [
                        ["hideNoImage", "Hide items with no image"],
                        ["hideNoDescription", "Hide items with no description"],
                        ["hideNoDate", "Hide items with no date"],
                        ["hideNoSecureLink", "Require HTTPS links"],
                        ["hideDuplicateDescriptions", "De-dupe descriptions"],
                        ["hideDuplicateTitles", "De-dupe titles"],
                        ["cleanTitle", "Clean titles"],
                        ["removeSiteNameFromTitle", "Remove site name from title"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(filterDraft[key])}
                          onChange={(e) => setFilterDraft((c) => ({ ...c, [key]: e.target.checked }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <R365Button disabled={busy} onClick={() => void saveFilters()}>
                      Save filters
                    </R365Button>
                  </div>
                </Panel>
              ) : null}

              {tab === "translation" ? (
                <Panel title="Translation (on crawl)">
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Settings are stored for each feed. Wire your crawl pipeline to providers when you enable translation in production.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={translationDraft.enabled}
                        onChange={(e) => setTranslationDraft((d) => ({ ...d, enabled: e.target.checked }))}
                      />
                      Enabled
                    </label>
                    <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                      Provider
                      <select
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                        value={translationDraft.provider}
                        onChange={(e) =>
                          setTranslationDraft((d) => ({ ...d, provider: e.target.value as RssTranslationProvider }))
                        }
                      >
                        <option value="deepl">DeepL</option>
                        <option value="google">Google</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </label>
                    <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                      From language
                      <input
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                        value={translationDraft.from_lang}
                        onChange={(e) => setTranslationDraft((d) => ({ ...d, from_lang: e.target.value }))}
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                      To language
                      <input
                        className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                        value={translationDraft.to_lang}
                        onChange={(e) => setTranslationDraft((d) => ({ ...d, to_lang: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="mt-4">
                    <R365Button disabled={busy} onClick={() => void saveTranslation()}>
                      Save translation settings
                    </R365Button>
                  </div>
                </Panel>
              ) : null}
            </>
          ) : null}

          {kind === "feed" && selectedFeedId && !feedDetail && !error ? (
            <p className="text-sm text-[color:var(--text-muted)]">Loading feed…</p>
          ) : null}

          {kind === "bundle" && selectedBundle ? (
            <Panel title="Bundle feeds">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Toggle which feeds contribute to this bundle&apos;s merged export (deduped by link).
              </p>
              <ul className="mt-4 space-y-2">
                {feeds.map((f) => {
                  const on = bundleFeedIds.includes(f.id);
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2">
                      <span className="text-sm font-medium">{f.name}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleFeedInBundle(f.id, !on)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          on ? "bg-violet-500/20 text-violet-800 dark:text-violet-200" : "bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {on ? "Attached" : "Attach"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {feeds.length === 0 ? <p className="text-xs text-[color:var(--text-muted)]">Create feeds first.</p> : null}
            </Panel>
          ) : null}

          {kind === "bundle" && selectedBundleId && !selectedBundle ? (
            <p className="text-sm text-[color:var(--text-muted)]">Loading bundle…</p>
          ) : null}

          {!selectedFeedId && !selectedBundleId ? (
            <Panel title="Get started">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Select a feed or bundle from the left, or create a new one. You need to be signed in (or use an admin token on API
                calls) for builder routes to work.
              </p>
            </Panel>
          ) : null}
        </main>

        <aside className="space-y-4">
          <Panel title="Export URLs">
            <p className="text-xs text-[color:var(--text-muted)]">
              These URLs are the generated feeds for your configured source. <strong className="text-[color:var(--text-secondary)]">RSS</strong> and{" "}
              <strong className="text-[color:var(--text-secondary)]">XML</strong> return the same RSS 2.0 document; XML uses a generic{" "}
              <code className="rounded bg-[color:var(--surface-muted)] px-1">application/xml</code> content type for tools that expect XML.{" "}
              <strong className="text-[color:var(--text-secondary)]">JSON</strong> is a structured alternative. Token is secret — treat like a password.
            </p>
            {exportUrls.rss ? (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">RSS (application/rss+xml)</p>
                  <p className="break-all font-mono text-[10px] leading-relaxed text-[color:var(--text-secondary)]">{exportUrls.rss}</p>
                  <div className="mt-1">
                    <R365Button variant="ghost" onClick={() => void copyText(exportUrls.rss)}>
                      Copy RSS URL
                    </R365Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">XML (application/xml)</p>
                  <p className="break-all font-mono text-[10px] leading-relaxed text-[color:var(--text-secondary)]">{exportUrls.xml}</p>
                  <div className="mt-1">
                    <R365Button variant="ghost" onClick={() => void copyText(exportUrls.xml)}>
                      Copy XML URL
                    </R365Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">JSON</p>
                  <p className="break-all font-mono text-[10px] leading-relaxed text-[color:var(--text-secondary)]">{exportUrls.json}</p>
                  <div className="mt-1">
                    <R365Button variant="ghost" onClick={() => void copyText(exportUrls.json)}>
                      Copy JSON URL
                    </R365Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--text-muted)]">Select a feed or bundle to see URLs.</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
