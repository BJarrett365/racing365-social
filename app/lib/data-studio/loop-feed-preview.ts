import { loopFeedTextToPlain } from "@/app/lib/data-studio/loop-feed";

export type LoopFeedPreviewItem = {
  id: string;
  teamName: string;
  platform: string;
  title: string;
  textPlain: string;
  postUrl: string;
  thumbnailUrl?: string;
  channelName?: string;
  channelAvatarUrl?: string;
  publishedAt: string;
  relativeLabel: string;
  youtubeVideoId?: string;
  extraMediaCount: number;
};

function relativeTimeLabel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function youtubeVideoIdFromRow(row: Record<string, unknown>): string | undefined {
  if (typeof row.externalId === "string" && row.externalId.trim()) return row.externalId.trim();
  const url = typeof row.url === "string" ? row.url : "";
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/i);
  return match?.[1];
}

function thumbnailFromMedia(raw: unknown): string | undefined {
  if (!Array.isArray(raw)) return undefined;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    if (o.type === "image" && typeof o.url === "string" && o.url.startsWith("http")) return o.url;
  }
  return undefined;
}

function mediaCount(raw: unknown): number {
  return Array.isArray(raw) ? raw.length : 0;
}

function platformLabel(service: unknown, type: unknown): string {
  if (typeof service === "string" && service.trim()) {
    const s = service.trim().toLowerCase();
    if (s === "youtube") return "YouTube";
    if (s === "twitter" || s === "x") return "X";
    return service.trim();
  }
  if (typeof type === "string" && type.trim()) return type.trim();
  return "Unknown";
}

/** Parse Loop Feed topic JSON into preview cards (highlights / news — not date-window strict). */
export function parseLoopFeedPreviewItems(json: unknown, teamName: string, maxItems = 40): LoopFeedPreviewItem[] {
  if (!Array.isArray(json)) return [];
  const rows: LoopFeedPreviewItem[] = [];

  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const postUrl = typeof row.url === "string" ? row.url.trim() : "";
    if (!postUrl) continue;

    const title =
      (typeof row.title === "string" && row.title.trim()) ||
      loopFeedTextToPlain(typeof row.text === "string" ? row.text : "").split("\n")[0]?.trim() ||
      "Untitled";
    const textRaw = typeof row.text === "string" ? row.text : "";
    const textPlain = loopFeedTextToPlain(textRaw).slice(0, 480);
    const dateRaw =
      typeof row.date === "string" ? row.date : typeof row.created === "string" ? row.created : "";
    const authorBlock = row.author && typeof row.author === "object" ? (row.author as Record<string, unknown>) : {};
    const platform = platformLabel(row.service, row.type);
    const youtubeVideoId = platform === "YouTube" ? youtubeVideoIdFromRow(row) : undefined;
    const thumb = thumbnailFromMedia(row.media);
    const extraMediaCount = Math.max(0, mediaCount(row.media) - 1);

    rows.push({
      id: typeof row.id === "string" ? row.id : `${teamName}-${postUrl}`,
      teamName,
      platform,
      title,
      textPlain,
      postUrl,
      thumbnailUrl: thumb ?? (youtubeVideoId ? `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg` : undefined),
      channelName: typeof authorBlock.name === "string" ? authorBlock.name : undefined,
      channelAvatarUrl: typeof authorBlock.image === "string" ? authorBlock.image : undefined,
      publishedAt: dateRaw,
      relativeLabel: relativeTimeLabel(dateRaw),
      youtubeVideoId,
      extraMediaCount,
    });
  }

  rows.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return rows.slice(0, maxItems);
}

export function filterPreviewItems(
  items: LoopFeedPreviewItem[],
  input: { teamName?: string; platform?: string },
): LoopFeedPreviewItem[] {
  let out = items;
  if (input.teamName?.trim()) {
    const key = input.teamName.trim().toLowerCase();
    out = out.filter((row) => row.teamName.trim().toLowerCase() === key);
  }
  if (input.platform?.trim() && input.platform !== "all") {
    const p = input.platform.trim().toLowerCase();
    out = out.filter((row) => row.platform.toLowerCase() === p || (p === "youtube" && row.platform === "YouTube"));
  }
  return out;
}
