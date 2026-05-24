export type LoopFeedTeamFeedType = "commentaries" | "match_highlights" | "match_videos" | "news";

export type LoopFeedTeamFeedTypeOption = {
  id: LoopFeedTeamFeedType;
  label: string;
  shortLabel: string;
  /** Where this feed is used in Planet Sport Studio */
  studioUsage: string;
  description: string;
};

/** Canonical order for club templates — four feeds per team. */
export const LOOP_FEED_TEAM_FEED_TYPES: LoopFeedTeamFeedTypeOption[] = [
  {
    id: "match_highlights",
    label: "Match highlights",
    shortLabel: "Highlights",
    studioUsage: "YouTube Transcripts",
    description: "Goal and incident video clips from Loop — transcribe for shorts, interviews, and highlight workflows.",
  },
  {
    id: "match_videos",
    label: "Match videos",
    shortLabel: "Videos",
    studioUsage: "Video library",
    description: "Broader club video feed from Loop — full clips, interviews, features, and extended highlights beyond the core transcript feed.",
  },
  {
    id: "commentaries",
    label: "Match commentaries",
    shortLabel: "Commentaries",
    studioUsage: "Match Reports",
    description: "Twitter/X club commentary and reaction — imported as manual sources in Match Report Builder.",
  },
  {
    id: "news",
    label: "News",
    shortLabel: "News",
    studioUsage: "Articles",
    description: "Mixed social, RSS, and video news — article imports, rewrites, and editorial learning.",
  },
];

export const LOOP_FEED_TEAM_FEED_TYPE_IDS = LOOP_FEED_TEAM_FEED_TYPES.map((row) => row.id);

export const DEFAULT_LOOP_FEED_TEAM_FEED_TYPE: LoopFeedTeamFeedType = "commentaries";

export function normalizeLoopFeedTeamFeedType(raw: unknown): LoopFeedTeamFeedType {
  if (raw === "commentaries" || raw === "match_highlights" || raw === "match_videos" || raw === "news") return raw;
  return DEFAULT_LOOP_FEED_TEAM_FEED_TYPE;
}

export function loopFeedTeamFeedTypeLabel(type: LoopFeedTeamFeedType | undefined): string {
  const id = type ?? DEFAULT_LOOP_FEED_TEAM_FEED_TYPE;
  return LOOP_FEED_TEAM_FEED_TYPES.find((row) => row.id === id)?.label ?? "Match commentaries";
}

export function loopFeedTeamFeedTypeStudioUsage(type: LoopFeedTeamFeedType | undefined): string {
  const id = type ?? DEFAULT_LOOP_FEED_TEAM_FEED_TYPE;
  return LOOP_FEED_TEAM_FEED_TYPES.find((row) => row.id === id)?.studioUsage ?? "Match Reports";
}

export function loopFeedTeamFeedTypeDescription(type: LoopFeedTeamFeedType | undefined): string {
  const id = type ?? DEFAULT_LOOP_FEED_TEAM_FEED_TYPE;
  return LOOP_FEED_TEAM_FEED_TYPES.find((row) => row.id === id)?.description ?? "";
}

export function loopFeedTeamDisplayName(name: string, feedType?: LoopFeedTeamFeedType): string {
  const trimmed = name.trim();
  const typeLabel = loopFeedTeamFeedTypeLabel(feedType);
  if (!trimmed) return typeLabel;
  return `${trimmed} · ${typeLabel}`;
}
