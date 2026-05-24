"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import type { LoopFeedPreviewItem } from "@/app/lib/data-studio/loop-feed-preview";
import type { LoopFeedTeamFeedType } from "@/app/lib/tools/loop-feed-team-feed-types";
import { LOOP_FEED_TEAM_FEED_TYPES } from "@/app/lib/tools/loop-feed-team-feed-types";
import { youtubeEmbedUrl } from "@/app/lib/youtube-script/embed";

type Props = {
  teamNames: string[];
  defaultFeedType?: LoopFeedTeamFeedType;
  defaultPlatform?: (typeof PLATFORM_OPTIONS)[number]["id"];
  /** When set (e.g. YouTube Importer), load video in-page instead of navigating away. */
  onSelectVideo?: (url: string) => void;
  selectActionLabel?: string;
};

const PLATFORM_OPTIONS = [
  { id: "all", label: "All platforms" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
] as const;

export function LoopFeedHighlightsPreview({
  teamNames,
  defaultFeedType = "match_highlights",
  defaultPlatform = "all",
  onSelectVideo,
  selectActionLabel = "Transcribe in YouTube Importer →",
}: Props) {
  const [feedType, setFeedType] = useState<LoopFeedTeamFeedType>(defaultFeedType);
  const [viewTeam, setViewTeam] = useState<string>("all");
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]["id"]>(defaultPlatform);
  const [items, setItems] = useState<LoopFeedPreviewItem[]>([]);
  const [errors, setErrors] = useState<Array<{ teamName: string; error: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const feedMeta = LOOP_FEED_TEAM_FEED_TYPES.find((row) => row.id === feedType);

  const visibleItems = useMemo(() => {
    let rows = items;
    if (viewTeam !== "all") {
      const key = viewTeam.toLowerCase();
      rows = rows.filter((row) => row.teamName.trim().toLowerCase() === key);
    }
    if (platform !== "all") {
      rows = rows.filter((row) => row.platform.toLowerCase() === platform);
    }
    return rows;
  }, [items, platform, viewTeam]);

  const runFeeds = async () => {
    setBusy(true);
    setFetchError(null);
    setPreviewKey(null);
    try {
      const res = await fetch(studioApiPath("/api/tools/loop-feed-preview"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedType }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: LoopFeedPreviewItem[];
        errors?: Array<{ teamName: string; error: string }>;
        fetchedAt?: string;
        error?: string;
      };
      if (!res.ok || data.ok === false) throw new Error(data.error || "Preview fetch failed");
      setItems(Array.isArray(data.items) ? data.items : []);
      setErrors(Array.isArray(data.errors) ? data.errors : []);
      setLastRun(data.fetchedAt ?? new Date().toISOString());
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Preview fetch failed");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[color:var(--text-primary)]">Feed preview</h2>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            {feedMeta?.label ?? "Match highlights"} · {feedMeta?.studioUsage ?? "YouTube Transcripts"} — run feeds to
            load the latest items from Loop.
          </p>
        </div>
        <R365Button type="button" onClick={() => void runFeeds()} disabled={busy}>
          {busy ? "Running feeds…" : "Run all feeds"}
        </R365Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Feed type
          <select
            value={feedType}
            onChange={(e) => {
              setFeedType(e.target.value as LoopFeedTeamFeedType);
              setItems([]);
              setLastRun(null);
              setPreviewKey(null);
            }}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {LOOP_FEED_TEAM_FEED_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.studioUsage}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          View by team
          <select
            value={viewTeam}
            onChange={(e) => setViewTeam(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="all">All teams</option>
            {teamNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Filter by platform
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as (typeof PLATFORM_OPTIONS)[number]["id"])}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {fetchError ? <p className="text-sm text-red-300">{fetchError}</p> : null}
      {errors.length > 0 ? (
        <p className="text-xs text-amber-300">
          {errors.length} feed{errors.length === 1 ? "" : "s"} failed: {errors.map((row) => row.teamName).join(", ")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3">
        <p className="text-sm font-bold text-[color:var(--text-primary)]">
          All items{" "}
          <span className="ml-1 rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-xs font-black text-white">
            {visibleItems.length}
          </span>
        </p>
        {lastRun ? (
          <p className="text-xs text-[color:var(--text-muted)]">Last run {new Date(lastRun).toLocaleString()}</p>
        ) : null}
      </div>

      {visibleItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[color:var(--border)] px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
          {busy ? "Fetching from Loop Feed…" : 'Click "Run all feeds" to load preview items.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((item) => {
            const itemKey = `${item.teamName}-${item.id}`;
            return (
              <PreviewCard
                key={itemKey}
                item={item}
                previewOpen={previewKey === itemKey}
                onTogglePreview={() => setPreviewKey((current) => (current === itemKey ? null : itemKey))}
                onSelectVideo={onSelectVideo}
                selectActionLabel={selectActionLabel}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PreviewCard({
  item,
  previewOpen,
  onTogglePreview,
  onSelectVideo,
  selectActionLabel,
}: {
  item: LoopFeedPreviewItem;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onSelectVideo?: (url: string) => void;
  selectActionLabel: string;
}) {
  const transcribeHref = item.youtubeVideoId
    ? withAppPathPrefix(`/tools/youtube-script-importer?url=${encodeURIComponent(item.postUrl)}`)
    : item.postUrl;

  return (
    <li className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
      <div className="flex gap-4">
        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-[color:var(--surface-muted)]">
          {item.youtubeVideoId ? (
            <button
              type="button"
              onClick={onTogglePreview}
              className="group relative h-full w-full"
              aria-expanded={previewOpen}
              aria-label={previewOpen ? "Hide video preview" : "Preview YouTube video"}
            >
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-muted)]">YouTube</div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/35 transition group-hover:bg-black/45">
                <span className="rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {previewOpen ? "Hide" : "Preview"}
                </span>
              </span>
            </button>
          ) : item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-muted)]">No image</div>
          )}
          {item.extraMediaCount > 0 ? (
            <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
              +{item.extraMediaCount}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <span className="font-bold text-[color:var(--text-secondary)]">{item.platform}</span>
            <span>·</span>
            <span>{item.relativeLabel || "—"}</span>
            <span>·</span>
            <span className="font-semibold text-[#22c55e]">{item.teamName}</span>
          </div>
          <h3 className="mt-1 text-sm font-black leading-snug text-[color:var(--text-primary)]">{item.title}</h3>
          {item.textPlain ? (
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[color:var(--text-secondary)]">{item.textPlain}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {item.channelAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.channelAvatarUrl} alt="" className="h-5 w-5 rounded-full" />
            ) : null}
            {item.channelName ? (
              <span className="text-xs font-semibold text-[color:var(--text-secondary)]">{item.channelName}</span>
            ) : null}
            {item.youtubeVideoId ? (
              <button
                type="button"
                onClick={onTogglePreview}
                className="text-xs font-bold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:underline"
              >
                {previewOpen ? "Hide preview" : "Watch preview"}
              </button>
            ) : null}
            {onSelectVideo && item.postUrl ? (
              <button
                type="button"
                onClick={() => onSelectVideo(item.postUrl)}
                className="text-xs font-bold text-[#22c55e] hover:underline"
              >
                {item.youtubeVideoId ? selectActionLabel : "Import source →"}
              </button>
            ) : (
              <Link href={transcribeHref} className="text-xs font-bold text-[#22c55e] hover:underline">
                {item.youtubeVideoId ? selectActionLabel : "Open source →"}
              </Link>
            )}
          </div>
        </div>
      </div>
      {previewOpen && item.youtubeVideoId ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--border)] bg-black">
          <iframe
            className="aspect-video w-full"
            src={youtubeEmbedUrl(item.youtubeVideoId)}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : null}
    </li>
  );
}
