"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
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
  published_at: string | null;
  source_domain: string | null;
  status: "visible" | "hidden" | "blocked";
  pinned: boolean;
};

type FeedFiltersRow = { feed_id: string; config: RssFilterConfig; updated_at: string };
type TranslationRow = {
  feed_id: string;
  enabled: boolean;
  from_lang: string;
  to_lang: string;
  provider: RssTranslationProvider;
};

type Tab = "overview" | "filters" | "translation" | "bundle";

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

function publicExportBase(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/rss-builder/public`;
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
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newBundleName, setNewBundleName] = useState("");
  const [blockDomain, setBlockDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedBundle = useMemo(
    () => bundles.find((b) => b.id === selectedBundleId) ?? null,
    [bundles, selectedBundleId],
  );

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

  const loadFeed = useCallback(
    (id: string) =>
      run(async () => {
        const data = await apiJson<{
          feed: RssFeedRow;
          items: RssFeedItemRow[];
          filters: FeedFiltersRow | null;
          translation: TranslationRow | null;
        }>(`/api/rss-builder/feeds/${id}`);
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
      }),
    [run],
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
    if (!base) return { rss: "", json: "" };
    if (kind === "feed" && feedDetail?.feed) {
      const { slug, export_token: token } = feedDetail.feed;
      return {
        rss: `${base}/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}&format=rss`,
        json: `${base}/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}&format=json`,
      };
    }
    if (kind === "bundle" && selectedBundle) {
      const { slug, export_token: token } = selectedBundle;
      return {
        rss: `${base}/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}&format=rss`,
        json: `${base}/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}&format=json`,
      };
    }
    return { rss: "", json: "" };
  }, [kind, feedDetail, selectedBundle]);

  const createFeed = () =>
    run(async () => {
      if (!newFeedName.trim() || !newFeedUrl.trim()) throw new Error("Name and source URL are required.");
      const data = await apiJson<{ feed: RssFeedRow }>("/api/rss-builder/feeds", {
        method: "POST",
        body: JSON.stringify({ name: newFeedName.trim(), source_type: "rss_url", source_url: newFeedUrl.trim() }),
      });
      setNewFeedName("");
      setNewFeedUrl("");
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
      await apiJson(`/api/rss-builder/feeds/${selectedFeedId}/crawl`, { method: "POST", body: JSON.stringify({}) });
      setMessage("Crawl finished.");
      await loadFeed(selectedFeedId);
      await loadList();
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
          Crawl RSS or Atom feeds, filter and normalise items in Supabase, then expose a stable RSS or JSON URL for Language Studio
          URL-to-article imports — no widgets, only clean export endpoints.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/language-studio?tab=Imports">
            <R365Button variant="ghost">Open Language Studio imports</R365Button>
          </Link>
        </div>
      </section>

      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <Panel title="Feeds">
            <div className="space-y-2">
              {feeds.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setKind("feed");
                    setSelectedFeedId(f.id);
                    setSelectedBundleId(null);
                    setTab("overview");
                  }}
                  className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition ${
                    kind === "feed" && selectedFeedId === f.id
                      ? "border-emerald-500/60 bg-emerald-500/10 text-white"
                      : "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--text-primary)] hover:border-emerald-500/40"
                  }`}
                >
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-xs text-[color:var(--text-muted)]">{f.status}</span>
                </button>
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
              <input
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                placeholder="RSS URL"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
              />
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
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setKind("bundle");
                    setSelectedBundleId(b.id);
                    setSelectedFeedId(null);
                    setTab("bundle");
                  }}
                  className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition ${
                    kind === "bundle" && selectedBundleId === b.id
                      ? "border-violet-500/60 bg-violet-500/10 text-[color:var(--text-primary)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface-muted)] hover:border-violet-500/40"
                  }`}
                >
                  <span className="font-semibold">{b.name}</span>
                </button>
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
              <div className="w-full [&>button]:w-full">
                <R365Button disabled={busy} onClick={() => void createBundle()}>
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
                {(["overview", "filters", "translation"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
                      tab === t ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200" : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    {t}
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
                          <option value="rss_url">RSS URL</option>
                          <option value="manual_urls">Manual URLs</option>
                          <option value="site_url">Site URL</option>
                          <option value="sitemap">Sitemap</option>
                          <option value="topic">Topic</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)] md:col-span-2">
                        Source URL
                        <input
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                          value={(feedFormDraft.source_url as string) ?? ""}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, source_url: e.target.value }))}
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)] md:col-span-2">
                        Manual URLs (one per line)
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs"
                          value={(feedFormDraft.manual_urls as string) ?? ""}
                          onChange={(e) => setFeedFormDraft((d) => ({ ...d, manual_urls: e.target.value }))}
                        />
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
                      <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                        Posts per feed (max stored)
                        <input
                          type="number"
                          min={1}
                          max={500}
                          className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm"
                          value={feedFormDraft.posts_per_feed ?? 50}
                          onChange={(e) =>
                            setFeedFormDraft((d) => ({ ...d, posts_per_feed: Number.parseInt(e.target.value, 10) || 50 }))
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <R365Button disabled={busy} onClick={() => void saveFeedFields()}>
                        Save feed
                      </R365Button>
                      <R365Button disabled={busy} onClick={() => void crawl()}>
                        Run crawl now
                      </R365Button>
                    </div>
                    <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                      Last crawl: {feedDetail.feed.last_crawled_at ? new Date(feedDetail.feed.last_crawled_at).toLocaleString() : "—"}
                      {" · "}
                      Next: {feedDetail.feed.next_crawl_at ? new Date(feedDetail.feed.next_crawl_at).toLocaleString() : "—"}
                    </p>
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
              Use these in Language Studio &quot;RSS / URL import&quot; or any reader. Token is secret — treat like a password.
            </p>
            {exportUrls.rss ? (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs font-bold uppercase text-[color:var(--text-muted)]">RSS</p>
                  <p className="break-all font-mono text-[10px] leading-relaxed text-[color:var(--text-secondary)]">{exportUrls.rss}</p>
                  <div className="mt-1">
                    <R365Button variant="ghost" onClick={() => void copyText(exportUrls.rss)}>
                      Copy RSS URL
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
