import type { LoopFeedContext, LoopFeedPostBrief } from "@/app/lib/data-studio/loop-feed";
import { loopFeedPostStandoutWeight } from "@/app/lib/data-studio/loop-feed";
import type { ManualSourceFormDraft } from "@/app/lib/match-report/extract-manual-sources-from-loop-feed";
import {
  compareReporterEditorialRank,
  formatReporterAffiliationBadge,
  formatReporterRankBadge,
  inferManualSourceTypeFromReporterRole,
  inferReporterOutlet,
  normalizeReporterHandle,
  reporterHandleKeys,
  reporterRoleLabel,
  type LoopFeedPriorityReporterRow,
} from "@/app/lib/tools/loop-feed-priority-reporters-shared";
import type { ManualSourceConfidence } from "@/app/lib/match-report/types";
import type { ManualSource } from "@/app/lib/match-report/types";

export type ManualSourceReporterPickerOption = {
  id: string;
  label: string;
  draft: ManualSourceFormDraft;
  reporterId?: string;
  /** Loop Feed side label (home or away club feed). */
  sideLabel?: string;
  teamSlot?: "home" | "away" | "other";
  groupLabel?: string;
};

type PostRef = {
  sideLabel: string;
  post: LoopFeedPostBrief;
};

function normalizeAuthorKey(post: LoopFeedPostBrief): string {
  const handle = normalizeReporterHandle(post.handle)?.toLowerCase();
  const author = post.author?.trim().toLowerCase();
  if (handle) return `@${handle}`;
  if (author) return author;
  return "";
}

function collectLoopFeedPosts(loopFeed: LoopFeedContext | null | undefined): PostRef[] {
  if (!loopFeed) return [];
  const out: PostRef[] = [];
  for (const side of loopFeed.sides) {
    if (side.error || side.posts.length === 0) continue;
    for (const post of side.posts) {
      if (!post.text.trim() && !post.postUrl) continue;
      out.push({ sideLabel: side.sideLabel, post });
    }
  }
  return out;
}

function postMatchesReporter(post: LoopFeedPostBrief, reporter: LoopFeedPriorityReporterRow): boolean {
  const author = post.author?.trim().toLowerCase() ?? "";
  const handle = normalizeReporterHandle(post.handle)?.toLowerCase() ?? "";
  const name = reporter.name.trim().toLowerCase();
  const handleKeys = reporterHandleKeys(reporter);

  if (handle && handleKeys.includes(handle)) return true;
  if (name && author && author === name) return true;
  if (name && author && author.includes(name)) return true;
  if (name && handle && handle.includes(name.replace(/\s+/g, "").toLowerCase())) return true;
  return false;
}

export function manualSourceMatchesReporter(
  source: ManualSource,
  reporter: LoopFeedPriorityReporterRow,
): boolean {
  if (source.derivedFrom !== "loop_feed") return false;
  const author = source.loopFeedAuthor?.trim().toLowerCase() ?? "";
  const handle = source.loopFeedHandle?.toLowerCase() ?? "";
  const name = reporter.name.trim().toLowerCase();
  const handleKeys = reporterHandleKeys(reporter);

  if (handle && handleKeys.includes(handle)) return true;
  if (name && author && (author === name || author.includes(name))) return true;
  return false;
}

function normalizeTeamToken(value: string): string {
  return value.toLowerCase().replace(/\bfc\b/g, "").replace(/[^a-z0-9]/g, "");
}

function teamsMatch(a: string, b: string): boolean {
  const left = normalizeTeamToken(a);
  const right = normalizeTeamToken(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function resolveTeamSlot(
  sideLabel: string,
  homeTeam: string,
  awayTeam: string,
): { teamSlot: "home" | "away" | "other"; groupLabel: string } {
  if (teamsMatch(sideLabel, homeTeam)) {
    return { teamSlot: "home", groupLabel: `${homeTeam} (Home)` };
  }
  if (teamsMatch(sideLabel, awayTeam)) {
    return { teamSlot: "away", groupLabel: `${awayTeam} (Away)` };
  }
  return { teamSlot: "other", groupLabel: sideLabel || "Other" };
}

function sideSortRank(teamSlot: "home" | "away" | "other"): number {
  if (teamSlot === "home") return 0;
  if (teamSlot === "away") return 1;
  return 2;
}

function isClubOfficialSource(source: ManualSource, teamLabel: string): boolean {
  const teamToken = normalizeTeamToken(teamLabel);
  const authorToken = normalizeTeamToken(source.loopFeedAuthor ?? "");
  const handle = source.loopFeedHandle?.toLowerCase() ?? "";
  if (teamToken && authorToken && (authorToken === teamToken || authorToken.includes(teamToken))) return true;
  if (handle && (handle === "lufc" || handle === "bhafc" || handle.endsWith("afc"))) {
    if (teamToken.includes("leeds") && handle === "lufc") return true;
    if (teamToken.includes("brighton") && (handle === "bhafc" || handle.includes("brighton"))) return true;
  }
  return false;
}

export type LoopFeedAuthorSourceGroup = {
  kind: "journalist" | "club" | "other";
  authorLabel: string;
  handle?: string;
  reporter?: LoopFeedPriorityReporterRow;
  sources: ManualSource[];
};

export function groupLoopFeedSourcesByAuthor(
  sources: ManualSource[],
  reporters: LoopFeedPriorityReporterRow[],
  teamLabel: string,
): LoopFeedAuthorSourceGroup[] {
  const loopSources = sources.filter((row) => row.derivedFrom === "loop_feed");
  const activeReporters = reporters.filter((row) => row.active);
  const buckets = new Map<string, LoopFeedAuthorSourceGroup>();

  for (const source of loopSources) {
    const matchedReporter = activeReporters.find((reporter) => manualSourceMatchesReporter(source, reporter));
    const handle = source.loopFeedHandle;
    const authorLabel =
      matchedReporter?.name ??
      source.loopFeedAuthor?.trim() ??
      (handle ? `@${handle}` : "Unknown author");
    const kind: LoopFeedAuthorSourceGroup["kind"] = isClubOfficialSource(source, teamLabel)
      ? "club"
      : matchedReporter || source.type === "Journalist opinion"
        ? "journalist"
        : "other";
    const key = `${kind}:${matchedReporter?.id ?? handle ?? authorLabel.toLowerCase()}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.sources.push(source);
      continue;
    }
    buckets.set(key, {
      kind,
      authorLabel,
      handle,
      reporter: matchedReporter,
      sources: [source],
    });
  }

  for (const group of buckets.values()) {
    group.sources.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  return [...buckets.values()].sort((a, b) => {
    const kindOrder = { journalist: 0, other: 1, club: 2 };
    if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
    if (a.reporter && b.reporter) return compareReporterEditorialRank(a.reporter, b.reporter);
    if (a.reporter) return -1;
    if (b.reporter) return 1;
    return a.authorLabel.localeCompare(b.authorLabel);
  });
}

function outletLabel(source: ManualSourceFormDraft["source"]): string {
  if (source === "Athletic") return "The Athletic";
  return source;
}

function pickBestPost(posts: PostRef[]): PostRef | null {
  if (posts.length === 0) return null;
  return [...posts].sort((a, b) => {
    const weightDiff =
      loopFeedPostStandoutWeight(b.post.editorialSignals) -
      loopFeedPostStandoutWeight(a.post.editorialSignals);
    if (weightDiff !== 0) return weightDiff;
    return Date.parse(b.post.time) - Date.parse(a.post.time);
  })[0]!;
}

function buildDraftFromReporter(
  reporter: LoopFeedPriorityReporterRow,
  best: PostRef | null,
): ManualSourceFormDraft {
  const source = inferReporterOutlet(reporter);
  const type = inferManualSourceTypeFromReporterRole(reporter.roleCategory);
  const day = best?.post.time.slice(0, 10) ?? "";
  const titleParts = [reporter.name.trim()];
  if (source !== "Notes") titleParts.push(outletLabel(source));
  if (day) titleParts.push(day);
  const confidence: ManualSourceConfidence =
    reporter.weight >= 75 || (best && loopFeedPostStandoutWeight(best.post.editorialSignals) >= 3)
      ? "High"
      : "Medium";

  return {
    source,
    type,
    confidence,
    title: titleParts.join(" · "),
    url: best?.post.postUrl ?? "",
    excerpt: best ? best.post.text.replace(/\s+/g, " ").trim() : reporter.editorialNote?.trim() ?? "",
  };
}

function buildDraftFromAuthorGroup(
  authorKey: string,
  posts: PostRef[],
  reporter?: LoopFeedPriorityReporterRow,
): ManualSourceFormDraft {
  const best = pickBestPost(posts)!;
  if (reporter) return buildDraftFromReporter(reporter, best);

  const author = best.post.author?.trim() || best.post.handle?.replace(/^@/, "") || authorKey;
  const hay = `${author} ${best.post.handle ?? ""} ${best.post.text} ${best.post.postUrl}`.toLowerCase();
  let source: ManualSourceFormDraft["source"] = "Notes";
  if (/\bbbc\b|bbc\.co\.uk|bbcsport/.test(hay)) source = "BBC";
  else if (/\bsky\b|skysports/.test(hay)) source = "Sky";
  else if (/theathletic|the athletic/.test(hay)) source = "Athletic";
  else if (/blog|substack/.test(hay)) source = "Blog";

  const type =
    source === "BBC" || source === "Sky" || source === "Athletic" ? "Journalist opinion" : "Other";

  return {
    source,
    type,
    confidence: loopFeedPostStandoutWeight(best.post.editorialSignals) >= 3 ? "High" : "Medium",
    title: [author, source !== "Notes" ? outletLabel(source) : null, best.post.time.slice(0, 10)]
      .filter(Boolean)
      .join(" · "),
    url: best.post.postUrl,
    excerpt: best.post.text.replace(/\s+/g, " ").trim(),
  };
}

function formatReporterPickerLabel(
  reporter: LoopFeedPriorityReporterRow,
  sideLabel: string,
  homeTeam: string,
  awayTeam: string,
): string {
  const { groupLabel } = resolveTeamSlot(sideLabel, homeTeam, awayTeam);
  return [
    reporter.name.trim(),
    reporterRoleLabel(reporter.roleCategory),
    formatReporterAffiliationBadge(reporter),
    groupLabel,
    formatReporterRankBadge(reporter),
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatAuthorPickerLabel(
  draft: ManualSourceFormDraft,
  authorLabel: string,
  sideLabel: string,
  homeTeam: string,
  awayTeam: string,
): string {
  const outlet = draft.source !== "Notes" ? outletLabel(draft.source) : null;
  const { groupLabel } = resolveTeamSlot(sideLabel, homeTeam, awayTeam);
  return [authorLabel, outlet, draft.type, groupLabel].filter(Boolean).join(" · ");
}

/** One row per priority reporter (or unmatched author) with posts in the imported Loop Feed — home and away sides. */
export function buildManualSourceReporterPickerOptions(input: {
  loopFeed: LoopFeedContext | null | undefined;
  reporters: LoopFeedPriorityReporterRow[];
  homeTeam?: string;
  awayTeam?: string;
}): ManualSourceReporterPickerOption[] {
  const posts = collectLoopFeedPosts(input.loopFeed);
  if (posts.length === 0) return [];

  const homeTeam = input.homeTeam?.trim() ?? "";
  const awayTeam = input.awayTeam?.trim() ?? "";
  const activeReporters = [...input.reporters.filter((row) => row.active)].sort(compareReporterEditorialRank);
  const out: ManualSourceReporterPickerOption[] = [];
  const claimedAuthorSideKeys = new Set<string>();

  for (const reporter of activeReporters) {
    const matched = posts.filter(({ post }) => postMatchesReporter(post, reporter));
    if (matched.length === 0) continue;

    const bySide = new Map<string, PostRef[]>();
    for (const row of matched) {
      const bucket = bySide.get(row.sideLabel) ?? [];
      bucket.push(row);
      bySide.set(row.sideLabel, bucket);
    }

    for (const [sideLabel, sidePosts] of bySide) {
      const best = pickBestPost(sidePosts);
      const draft = buildDraftFromReporter(reporter, best);
      const { teamSlot, groupLabel } = resolveTeamSlot(sideLabel, homeTeam, awayTeam);
      out.push({
        id: `reporter:${reporter.id}:${sideLabel}`,
        label: formatReporterPickerLabel(reporter, sideLabel, homeTeam, awayTeam),
        draft,
        reporterId: reporter.id,
        sideLabel,
        teamSlot,
        groupLabel,
      });
      for (const row of sidePosts) {
        const key = normalizeAuthorKey(row.post);
        if (key) claimedAuthorSideKeys.add(`${sideLabel}:${key}`);
      }
    }
  }

  const byAuthorSide = new Map<string, PostRef[]>();
  for (const row of posts) {
    const authorKey = normalizeAuthorKey(row.post);
    if (!authorKey) continue;
    const sideKey = `${row.sideLabel}:${authorKey}`;
    if (claimedAuthorSideKeys.has(sideKey)) continue;
    const bucket = byAuthorSide.get(sideKey) ?? [];
    bucket.push(row);
    byAuthorSide.set(sideKey, bucket);
  }

  for (const [sideKey, group] of byAuthorSide) {
    const sideLabel = group[0]?.sideLabel ?? "";
    const authorKey = sideKey.slice(sideLabel.length + 1);
    const draft = buildDraftFromAuthorGroup(authorKey, group);
    const authorLabel = group[0]?.post.author?.trim() || group[0]?.post.handle?.replace(/^@/, "") || authorKey;
    const { teamSlot, groupLabel } = resolveTeamSlot(sideLabel, homeTeam, awayTeam);
    out.push({
      id: `author:${sideKey}`,
      label: formatAuthorPickerLabel(draft, authorLabel, sideLabel, homeTeam, awayTeam),
      draft,
      sideLabel,
      teamSlot,
      groupLabel,
    });
  }

  out.sort((a, b) => {
    const slotDiff = sideSortRank(a.teamSlot ?? "other") - sideSortRank(b.teamSlot ?? "other");
    if (slotDiff !== 0) return slotDiff;
    const aReporter = input.reporters.find((row) => row.id === a.reporterId);
    const bReporter = input.reporters.find((row) => row.id === b.reporterId);
    if (aReporter && bReporter) return compareReporterEditorialRank(aReporter, bReporter);
    if (aReporter) return -1;
    if (bReporter) return 1;
    return a.label.localeCompare(b.label);
  });

  return out;
}

export function mergeManualSourceDraftFromPick(
  current: ManualSourceFormDraft,
  picked: ManualSourceFormDraft,
): ManualSourceFormDraft {
  return {
    source: current.source === "Notes" ? picked.source : current.source,
    type: current.type === "Other" ? picked.type : current.type,
    confidence: current.confidence,
    title: current.title.trim() ? current.title : picked.title,
    url: current.url.trim() ? current.url : picked.url,
    excerpt: current.excerpt.trim() ? current.excerpt : picked.excerpt,
  };
}
