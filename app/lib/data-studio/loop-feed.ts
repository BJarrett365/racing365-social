/**
 * Loop Feed (q.loop-feed.com) — normalise topic JSON for Data Studio match reports.
 * Raw shape matches Loop Feed topic content API (array of social items).
 */

export type LoopFeedMediaItem = { kind: "video" | "photo" | "unknown"; url: string };

export type LoopFeedPostBrief = {
  /** ISO timestamp from feed */
  time: string;
  text: string;
  postUrl: string;
  author?: string;
  handle?: string;
  media: LoopFeedMediaItem[];
  /** Soft hints for the model (GOAL, VAR, red card language in post text). */
  editorialSignals: string[];
};

export type LoopFeedSideResult = {
  sideLabel: string;
  sourceUrl: string;
  posts: LoopFeedPostBrief[];
  error?: string;
};

export type LoopFeedContext = {
  contextDate: string;
  fetchedAt: string;
  sides: LoopFeedSideResult[];
};

/** True when URL is likely a direct file suitable for HTML `<video src>` (no iframe). */
export function isProbablyDirectVideoStreamUrl(url: string): boolean {
  const raw = url.trim();
  if (!/^https:\/\//i.test(raw)) return false;
  const path = raw.split(/[?#]/)[0] ?? raw;
  return /\.(mp4|webm|m4v|ogv)(\s*$)/i.test(path) || /\.m3u8(\s*$)/i.test(path);
}

/** Goal / send-off / VAR / highlight style posts that should surface watch links or embeds. */
export function loopFeedPostIsIncidentClipCandidate(post: LoopFeedPostBrief): boolean {
  const tags = new Set(post.editorialSignals);
  if (
    tags.has("goal_language") ||
    tags.has("red_card_language") ||
    tags.has("review_controversy_language") ||
    tags.has("highlight_language")
  ) {
    return true;
  }
  return /\bgoal\b|scorer|send(?:ing)?\s+off|red\s+card|sent\s+off|\bVAR\b|penalty|offside/i.test(post.text);
}

export function loopFeedHasDirectIncidentVideos(ctx: LoopFeedContext): boolean {
  for (const side of ctx.sides) {
    for (const post of side.posts) {
      if (!loopFeedPostIsIncidentClipCandidate(post)) continue;
      if (post.media.some((m) => isProbablyDirectVideoStreamUrl(m.url))) return true;
    }
  }
  return false;
}

function digestVideoEmbedLines(post: LoopFeedPostBrief): string[] {
  const incidentClip = loopFeedPostIsIncidentClipCandidate(post);
  const videoMedias = post.media.filter((m) => m.kind === "video" || isProbablyDirectVideoStreamUrl(m.url));
  const lines: string[] = [];

  for (const vm of videoMedias) {
    if (isProbablyDirectVideoStreamUrl(vm.url)) {
      lines.push(
        `   - **VIDEO EMBED (direct file — include in article):** output HTML exactly once as \`<video controls preload="metadata" playsinline width="100%" src="${vm.url}"></video>\` — **src must match character-for-character**; also add \`<a href="${post.postUrl}" target="_blank" rel="noopener noreferrer">Watch on platform</a>\`.`,
      );
    } else if (vm.kind === "video") {
      lines.push(
        `   - **Video clip (platform URL — no iframe):** HTML \`<a href="${vm.url}" target="_blank" rel="noopener noreferrer">Watch clip</a>\` and \`<a href="${post.postUrl}" target="_blank" rel="noopener noreferrer">Original post</a>\`.`,
      );
    }
  }

  if (incidentClip && videoMedias.length === 0) {
    lines.push(
      `   - **Incident clip (goal / send-off / VAR / highlight angle):** feed has no separate media URL — include \`<a href="${post.postUrl}" target="_blank" rel="noopener noreferrer">Watch / clip</a>\` under \`<h2>Social reaction & video clips</h2>\`.`,
    );
  }

  return lines;
}

/**
 * Compact lines the model can follow without parsing a huge FIXTURE_JSON block first.
 * Use in prompts when LOOP_FEED_JSON is attached.
 */
export function loopFeedEditorDigest(ctx: LoopFeedContext): string {
  const hasStandout = loopFeedHasStandoutAngles(ctx);
  const header = hasStandout
    ? "_Posts are ordered with **standout editorial angles** (records, controversy, farewells, thriller framing, goals) first — treat the top items as candidates for the standfirst / dek._\n\n"
    : "";

  const chunks: string[] = [];
  let n = 0;
  for (const side of ctx.sides) {
    if (side.error) {
      chunks.push(`- **${side.sideLabel}**: topic fetch failed — ${side.error}`);
      continue;
    }
    for (const p of side.posts) {
      n += 1;
      const handle = p.handle?.replace(/^@/, "");
      const who =
        [p.author, handle ? `@${handle}` : ""].filter(Boolean).join(" · ") || "(author not supplied)";
      const flat = p.text.replace(/\s+/g, " ").trim();
      const textOneLine = flat.slice(0, 360);
      const ellipsis = flat.length > 360 ? "…" : "";
      const mediaKinds = p.media.map((m) => m.kind).join(", ") || "none";
      const sig = p.editorialSignals.length ? ` · editorialSignals: ${p.editorialSignals.join(", ")}` : "";
      const videoLines = digestVideoEmbedLines(p);
      chunks.push(
        [`**${n}. [${side.sideLabel}]** ${who}`, `   - Snippet: ${textOneLine}${ellipsis}`, `   - **postUrl (use as HTML \`<a href="…">label</a>\` href verbatim):** ${p.postUrl}`, `   - Media: ${mediaKinds}${sig}`, ...videoLines].join("\n"),
      );
    }
  }
  return chunks.length ? header + chunks.join("\n\n") : `_No posts matched the Loop Feed date filter for contextDate ${ctx.contextDate}._`;
}

const SIGNAL_PATTERNS: Array<{ re: RegExp; tag: string }> = [
  { re: /\bGOAL\b|\bGOOOOO/i, tag: "goal_language" },
  { re: /\bred card\b|sent off/i, tag: "red_card_language" },
  { re: /\bVAR\b|ruled out|offside|handball|penalty.*review|chalked off/i, tag: "review_controversy_language" },
  { re: /\bhighlight\b|\bclip\b|\bwatch\b/i, tag: "highlight_language" },
  /** BBC / Sky-style “push notification” angles — records, controversy, farewells, narrative hooks */
  {
    re: /\bassist\s+record\b|\bpremier\s+league\s+record\b|\bpl\s+record\b|\bequals\b.*\brecord\b|\bequalled\b.*\brecord\b|\bbreaks?\b.*\brecord\b|\bclub\s+record\b|\bhistoric\b|\bmilestone\b/i,
    tag: "record_milestone_language",
  },
  {
    re: /\bcontroversial\b|\bcontentious\b|talking\s+point|sparked\s+debate|furor|debate\s+rages/i,
    tag: "controversy_debate_language",
  },
  {
    re: /\bfor\s+the\s+last\s+time\b|final\s+appearance|said\s+farewell|emotional\s+farewell|farewell\b|last\s+dance|leaves\s+the\s+pitch.*last|last\s+time\s+at\b/i,
    tag: "farewell_last_game_language",
  },
  {
    re: /\bfive-goal\b|\bfive\s+goal\b|\bseven-goal\b|seven\s+goal|thriller|last-gasp|dramatic\s+(winner|finish|late)|snatch(?:ed)?\s+(?:a\s+)?win|\bedge\s+a\s+five(?:[\s-]goal)?|\bedged\b/i,
    tag: "big_score_narrative_language",
  },
];

/** Tags we surface first in digest order and tell the model to treat as standfirst candidates. */
export const LOOP_STANDOUT_EDITORIAL_TAGS = new Set([
  "record_milestone_language",
  "controversy_debate_language",
  "farewell_last_game_language",
  "big_score_narrative_language",
  "review_controversy_language",
  "goal_language",
]);

const STANDOUT_TAG_WEIGHT: Partial<Record<string, number>> = {
  record_milestone_language: 6,
  controversy_debate_language: 5,
  farewell_last_game_language: 5,
  review_controversy_language: 5,
  big_score_narrative_language: 3,
  goal_language: 2,
  red_card_language: 3,
  highlight_language: 2,
};

export function loopFeedPostStandoutWeight(signals: string[]): number {
  let w = 0;
  for (const t of signals) w += STANDOUT_TAG_WEIGHT[t] ?? 0;
  return w;
}

export function loopFeedHasStandoutAngles(ctx: LoopFeedContext): boolean {
  for (const side of ctx.sides) {
    for (const post of side.posts) {
      for (const tag of post.editorialSignals) {
        if (LOOP_STANDOUT_EDITORIAL_TAGS.has(tag)) return true;
      }
    }
  }
  return false;
}

export function loopFeedTextToPlain(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function calendarDateInTimeZone(iso: string, timeZone: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date(t));
  } catch {
    return null;
  }
}

function editorialSignalsFromText(text: string): string[] {
  const tags = new Set<string>();
  for (const { re, tag } of SIGNAL_PATTERNS) {
    if (re.test(text)) tags.add(tag);
  }
  return [...tags];
}

function parseMedia(raw: unknown): LoopFeedMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: LoopFeedMediaItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const url = typeof o.url === "string" && o.url.startsWith("http") ? o.url : "";
    if (!url) continue;
    const t = typeof o.type === "string" ? o.type.toLowerCase() : "";
    const kind: LoopFeedMediaItem["kind"] =
      t === "video" ? "video" : t === "photo" ? "photo" : "unknown";
    out.push({ kind, url });
  }
  return out;
}

/** SSRF-safe: only Loop Feed HTTPS host. */
export function assertAllowedLoopFeedUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty Loop Feed URL.");
  const u = new URL(trimmed);
  if (u.protocol !== "https:") throw new Error("Loop Feed URL must use https.");
  if (u.hostname !== "q.loop-feed.com") {
    throw new Error("Only https://q.loop-feed.com topic URLs are allowed.");
  }
  return u;
}

/** Ensure path ends with `/content` (topic content endpoint). */
export function toLoopTopicContentUrl(input: string): string {
  const u = assertAllowedLoopFeedUrl(input);
  let path = u.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/content")) path = `${path}/content`;
  u.pathname = path;
  return u.toString();
}

function yyyyMmDdToUtcMs(date: string): number {
  return Date.parse(`${date}T12:00:00.000Z`);
}

export function isLoopFeedDayInWindow(
  day: string,
  anchorDate: string,
  lookbackDays: number,
  lookforwardDays: number,
): boolean {
  const dayMs = yyyyMmDdToUtcMs(day);
  const anchorMs = yyyyMmDdToUtcMs(anchorDate);
  if (!Number.isFinite(dayMs) || !Number.isFinite(anchorMs)) return false;
  const start = anchorMs - lookbackDays * 86_400_000;
  const end = anchorMs + lookforwardDays * 86_400_000;
  return dayMs >= start && dayMs <= end;
}

export type LoopFeedDateFilter = {
  /** Days before anchor date to include (0 = exact day only when lookforwardDays is also 0). */
  lookbackDays?: number;
  /** Days after anchor date to include. */
  lookforwardDays?: number;
};

/** Human-readable window label for UI, e.g. "2026-05-14 → 2026-05-24". */
export function loopFeedDateWindowLabel(anchorDate: string, filter: LoopFeedDateFilter): string {
  const lookback = filter.lookbackDays ?? 0;
  const forward = filter.lookforwardDays ?? 0;
  if (lookback === 0 && forward === 0) return anchorDate;
  const start = new Date(yyyyMmDdToUtcMs(anchorDate) - lookback * 86_400_000).toISOString().slice(0, 10);
  const end = new Date(yyyyMmDdToUtcMs(anchorDate) + forward * 86_400_000).toISOString().slice(0, 10);
  return `${start} → ${end}`;
}

export const MATCH_REPORT_LOOP_FEED_DATE_FILTER: LoopFeedDateFilter = {
  lookbackDays: 3,
  lookforwardDays: 7,
};

export function normalizeLoopFeedItems(
  json: unknown,
  contextDate: string,
  maxPerSide: number,
  timeZone = process.env.LOOP_FEED_DAY_TZ?.trim() || "Europe/London",
  dateFilter: LoopFeedDateFilter = {},
): LoopFeedPostBrief[] {
  if (!Array.isArray(json)) return [];
  const lookback = dateFilter.lookbackDays ?? 0;
  const lookforward = dateFilter.lookforwardDays ?? 0;
  const rows: LoopFeedPostBrief[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const dateRaw = typeof row.date === "string" ? row.date : typeof row.created === "string" ? row.created : "";
    const day = calendarDateInTimeZone(dateRaw, timeZone);
    if (!day) continue;
    const inRange =
      lookback === 0 && lookforward === 0
        ? day === contextDate
        : isLoopFeedDayInWindow(day, contextDate, lookback, lookforward);
    if (!inRange) continue;

    const postUrl = typeof row.url === "string" ? row.url : "";
    if (!postUrl) continue;

    const textRaw = typeof row.text === "string" ? row.text : "";
    const text = loopFeedTextToPlain(textRaw).slice(0, 1200);
    const authorBlock = row.author && typeof row.author === "object" ? (row.author as Record<string, unknown>) : {};
    const author = typeof authorBlock.name === "string" ? authorBlock.name : undefined;
    const handle = typeof authorBlock.username === "string" ? authorBlock.username : undefined;
    const media = parseMedia(row.media);
    const editorialSignals = editorialSignalsFromText(`${textRaw} ${postUrl}`);

    rows.push({
      time: dateRaw,
      text,
      postUrl,
      author,
      handle,
      media,
      editorialSignals,
    });
  }
  rows.sort((a, b) => {
    const dw = loopFeedPostStandoutWeight(b.editorialSignals) - loopFeedPostStandoutWeight(a.editorialSignals);
    if (dw !== 0) return dw;
    return Date.parse(b.time) - Date.parse(a.time);
  });
  return rows.slice(0, maxPerSide);
}
