import { createHash } from "crypto";
import type { LoopFeedContext, LoopFeedPostBrief, LoopFeedSideResult } from "@/app/lib/data-studio/loop-feed";
import { loopFeedPostStandoutWeight } from "@/app/lib/data-studio/loop-feed";
import { matchJournalistProfileByLoopFeedAuthor } from "@/app/lib/language-studio/journalist-stats";
import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";
import { normalizeReporterHandle } from "@/app/lib/tools/loop-feed-priority-reporters-shared";
import type { ManualSource, ManualSourceConfidence, ManualSourceType } from "@/app/lib/match-report/types";

const MAX_POSTS_PER_SIDE = 20;

function inferManualSourceOutlet(
  sideLabel: string,
  post: LoopFeedPostBrief,
): Exclude<ManualSource["source"], "Loop Feed"> {
  const sideHay = sideLabel.toLowerCase();
  if (/\bbbc\b|bbcsport/.test(sideHay)) return "BBC";
  if (/\bsky\b|skysports|sky sports/.test(sideHay)) return "Sky";
  if (/theathletic|the athletic/.test(sideHay)) return "Athletic";
  const hay = `${sideLabel} ${post.author ?? ""} ${post.handle ?? ""} ${post.text} ${post.postUrl}`.toLowerCase();
  if (/\bbbc\b|bbc\.co\.uk|bbcsport/.test(hay)) return "BBC";
  if (/\bsky\b|skysports|sky sports/.test(hay)) return "Sky";
  if (/theathletic|the athletic/.test(hay)) return "Athletic";
  if (/blog|substack|medium\.com/.test(hay)) return "Blog";
  if (/^https?:\/\//.test(post.postUrl.trim())) return "URL";
  return "Notes";
}

function buildPickerTitle(
  sideLabel: string,
  post: LoopFeedPostBrief,
  outlet: Exclude<ManualSource["source"], "Loop Feed">,
): string {
  const author = post.author?.trim() || post.handle?.replace(/^@/, "") || sideLabel;
  const outletLabel = outlet === "Athletic" ? "The Athletic" : outlet;
  const day = post.time.slice(0, 10);
  const parts = [author];
  if (outlet !== "Notes" && outlet !== "URL") parts.push(outletLabel);
  if (day) parts.push(day);
  return parts.join(" · ");
}

function buildNotesExcerpt(post: LoopFeedPostBrief): string {
  return post.text.replace(/\s+/g, " ").trim();
}

export type ManualSourceFormDraft = {
  source: Exclude<ManualSource["source"], "Loop Feed">;
  type: ManualSourceType;
  confidence: ManualSourceConfidence;
  title: string;
  url: string;
  excerpt: string;
};

export type LoopFeedSourcePickerOption = {
  id: string;
  label: string;
  draft: ManualSourceFormDraft;
};

export function loopFeedPostToManualSourceFormDraft(
  sideLabel: string,
  post: LoopFeedPostBrief,
): ManualSourceFormDraft {
  const source = inferManualSourceOutlet(sideLabel, post);
  return {
    source,
    type: inferManualSourceType(sideLabel, post),
    confidence: inferConfidence(post),
    title: buildPickerTitle(sideLabel, post, source),
    url: post.postUrl,
    excerpt: buildNotesExcerpt(post),
  };
}

export function formatLoopFeedSourcePickerLabel(sideLabel: string, post: LoopFeedPostBrief): string {
  const draft = loopFeedPostToManualSourceFormDraft(sideLabel, post);
  const author = post.author?.trim() || post.handle?.replace(/^@/, "") || sideLabel;
  const outletLabel = draft.source === "Athletic" ? "The Athletic" : draft.source;
  const outletPart = outletLabel !== "Notes" && outletLabel !== "URL" ? outletLabel : null;
  return [author, outletPart, draft.type].filter(Boolean).join(" · ");
}

export function buildLoopFeedSourcePickerOptions(
  loopFeed: LoopFeedContext | null | undefined,
): LoopFeedSourcePickerOption[] {
  if (!loopFeed) return [];
  const out: LoopFeedSourcePickerOption[] = [];
  const seen = new Set<string>();

  for (const side of loopFeed.sides) {
    if (side.error || side.posts.length === 0) continue;
    for (const post of side.posts) {
      if (!post.text.trim() && !post.postUrl) continue;
      const id = loopFeedManualSourceId(side.sideLabel, post.postUrl);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        label: formatLoopFeedSourcePickerLabel(side.sideLabel, post),
        draft: loopFeedPostToManualSourceFormDraft(side.sideLabel, post),
      });
    }
  }

  out.sort((a, b) => {
    const aJournalist = a.draft.type === "Journalist opinion" ? 0 : 1;
    const bJournalist = b.draft.type === "Journalist opinion" ? 0 : 1;
    if (aJournalist !== bJournalist) return aJournalist - bJournalist;
    return a.label.localeCompare(b.label);
  });

  return out;
}

function inferManualSourceType(sideLabel: string, post: LoopFeedPostBrief): ManualSourceType {
  const tags = new Set(post.editorialSignals);
  if (tags.has("review_controversy_language") || tags.has("controversy_debate_language")) {
    return "Journalist opinion";
  }
  if (tags.has("goal_language") || tags.has("highlight_language") || tags.has("big_score_narrative_language")) {
    return "Match report";
  }
  if (/["“][^"”]{8,}["”]/.test(post.text)) return "Quotes";
  if (/\bformation\b|\btactic\b|\bpress\b|\bline-up\b|\blineup\b/i.test(post.text)) return "Tactical note";
  const outlet = inferManualSourceOutlet(sideLabel, post);
  if ((outlet === "BBC" || outlet === "Sky" || outlet === "Athletic") && post.author?.trim()) {
    return "Journalist opinion";
  }
  return "Other";
}

function inferConfidence(post: LoopFeedPostBrief): ManualSourceConfidence {
  return loopFeedPostStandoutWeight(post.editorialSignals) >= 3 ? "High" : "Medium";
}

function buildTitle(sideLabel: string, post: LoopFeedPostBrief): string {
  const handle = post.handle?.replace(/^@/, "");
  const who = [post.author, handle ? `@${handle}` : ""].filter(Boolean).join(" · ");
  const day = post.time.slice(0, 10);
  return who ? `[${sideLabel}] ${who}${day ? ` · ${day}` : ""}` : `[${sideLabel}]${day ? ` ${day}` : ""}`;
}

function buildExcerpt(post: LoopFeedPostBrief): string {
  const text = post.text.replace(/\s+/g, " ").trim();
  const mediaNote =
    post.media.length > 0
      ? `\n\nMedia: ${post.media.map((m) => `${m.kind}${m.url ? ` ${m.url}` : ""}`).join("; ")}`
      : "";
  const signals =
    post.editorialSignals.length > 0 ? `\n\nSignals: ${post.editorialSignals.join(", ")}` : "";
  return `${text}${mediaNote}${signals}`.trim();
}

function loopFeedManualSourceId(sideLabel: string, postUrl: string): string {
  const side = sideLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  const hash = createHash("sha256").update(`${side}|${postUrl}`).digest("hex").slice(0, 20);
  return `loopfeed-${side || "side"}-${hash}`;
}

function parseLoopFeedSideLabelFromTitle(title: string | undefined): string | null {
  if (!title) return null;
  const match = title.match(/^\[([^\]]+)\]/);
  return match?.[1]?.trim() || null;
}

function postToManualSource(
  sideLabel: string,
  post: LoopFeedPostBrief,
  importedAt: string,
  opts?: { journalistProfiles?: LanguageJournalistProfile[]; brand?: string },
): ManualSource {
  const handle = normalizeReporterHandle(post.handle);
  const matched = matchJournalistProfileByLoopFeedAuthor(opts?.journalistProfiles ?? [], {
    author: post.author,
    handle: handle ?? post.handle,
    brand: opts?.brand,
  });
  return {
    id: loopFeedManualSourceId(sideLabel, post.postUrl),
    source: "Loop Feed",
    type: inferManualSourceType(sideLabel, post),
    confidence: inferConfidence(post),
    title: buildTitle(sideLabel, post),
    url: post.postUrl,
    excerpt: buildExcerpt(post),
    derivedFrom: "loop_feed",
    loopFeedSideLabel: sideLabel,
    loopFeedAuthor: post.author?.trim() || undefined,
    loopFeedHandle: handle,
    journalistProfileId: matched?.id,
    importedAt,
  };
}

/** Convert Loop Feed posts into manual source rows for the editorial layer. */
export function extractManualSourcesFromLoopFeed(
  loopFeed: LoopFeedContext,
  opts?: { journalistProfiles?: LanguageJournalistProfile[]; brand?: string },
): ManualSource[] {
  const importedAt = new Date().toISOString();
  const out: ManualSource[] = [];
  const seenIds = new Set<string>();

  for (const side of loopFeed.sides) {
    if (side.error || side.posts.length === 0) continue;
    for (const post of side.posts.slice(0, MAX_POSTS_PER_SIDE)) {
      const excerpt = buildExcerpt(post);
      if (!excerpt.trim()) continue;
      const row = postToManualSource(side.sideLabel, post, importedAt, opts);
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      out.push(row);
    }
  }

  return out;
}

export function dedupeManualSourcesById(sources: ManualSource[]): ManualSource[] {
  const byId = new Map<string, ManualSource>();
  for (const row of sources) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

export function countLoopFeedPosts(
  loopFeed: { sides: LoopFeedSideResult[] } | null | undefined,
): number {
  if (!loopFeed) return 0;
  return loopFeed.sides.reduce((total, side) => total + side.posts.length, 0);
}

export function loopFeedSatisfiesManualSources(project: {
  layers: {
    loopFeed: { sides: LoopFeedSideResult[] } | null | undefined;
    manualSources: ManualSource[];
  };
}): boolean {
  if (project.layers.manualSources.some((row) => row.derivedFrom === "loop_feed")) return true;
  return countLoopFeedPosts(project.layers.loopFeed ?? null) > 0;
}

export type LoopFeedTeamManualSourceGroup = {
  sideLabel: string;
  teamLabel: string;
  sources: ManualSource[];
  postCount: number;
  error?: string;
};

function manualSourceSideLabel(row: ManualSource): string | null {
  if (row.loopFeedSideLabel?.trim()) return row.loopFeedSideLabel.trim();
  return parseLoopFeedSideLabelFromTitle(row.title);
}

/** Group Loop Feed manual sources by home/away side for UI display. */
export function groupLoopFeedManualSourcesByTeam(input: {
  manualSources: ManualSource[];
  loopFeed: { sides: LoopFeedSideResult[] } | null | undefined;
  homeTeam: string;
  awayTeam: string;
}): LoopFeedTeamManualSourceGroup[] {
  const loopSources = input.manualSources.filter((row) => row.derivedFrom === "loop_feed");
  const bySide = new Map<string, ManualSource[]>();

  for (const row of loopSources) {
    const side = manualSourceSideLabel(row) ?? "Other";
    const bucket = bySide.get(side) ?? [];
    bucket.push(row);
    bySide.set(side, bucket);
  }

  const sides = input.loopFeed?.sides ?? [];
  if (sides.length > 0) {
    return sides.map((side, index) => {
      const sideLabel = side.sideLabel.trim() || (index === 0 ? input.homeTeam : input.awayTeam);
      const sources =
        bySide.get(side.sideLabel) ??
        bySide.get(sideLabel) ??
        [];
      return {
        sideLabel,
        teamLabel: sideLabel,
        sources,
        postCount: side.error ? 0 : side.posts.length,
        error: side.error,
      };
    });
  }

  const fallbackLabels = [input.homeTeam, input.awayTeam].filter(Boolean);
  if (fallbackLabels.length === 0 && bySide.size === 0) return [];

  const labels = fallbackLabels.length > 0 ? fallbackLabels : [...bySide.keys()];
  return labels.map((teamLabel) => ({
    sideLabel: teamLabel,
    teamLabel,
    sources: bySide.get(teamLabel) ?? [],
    postCount: bySide.get(teamLabel)?.length ?? 0,
  }));
}

export function formatLoopFeedManualSourcesSummary(
  groups: LoopFeedTeamManualSourceGroup[],
  totalManual: number,
  loopCount: number,
): string {
  const plural = totalManual === 1 ? "" : "s";
  if (loopCount === 0) return `${totalManual} source${plural}`;

  const teamParts = groups
    .map((group) => {
      const count = group.sources.length > 0 ? group.sources.length : group.postCount;
      if (count === 0 && group.error) return `${group.teamLabel}: ${group.error}`;
      return `${group.teamLabel}: ${count}`;
    })
    .join(" · ");

  return `${totalManual} source${plural} (${teamParts} from Loop Feed)`;
}
