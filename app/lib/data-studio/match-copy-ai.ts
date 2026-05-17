import {
  MATCH_PREVIEW_PLANET_SPORT_PROMPT,
  MATCH_REPORT_PLANET_SPORT_PROMPT,
  MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT,
} from "@/app/lib/prompts-catalog";
import {
  loopFeedEditorDigest,
  loopFeedHasStandoutAngles,
  loopFeedHasDirectIncidentVideos,
  type LoopFeedContext,
} from "@/app/lib/data-studio/loop-feed";
import type { MatchCopyMode } from "@/app/lib/data-studio/types";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";

const MAX_FIXTURE_JSON_CHARS = 120_000;
const MAX_LOOP_FEED_JSON_CHARS = 36_000;

const WORDPRESS_HTML_OUTPUT_APPEND = `

OUTPUT FORMAT (required — WordPress publishing / SEO):
- Return **only** a contiguous **HTML fragment** for the post body (no \`<html>\`, \`<body>\`, headers, or site chrome). British English.
- **Exactly one** \`<h1>\` for the article headline (primary SEO title).
- Sections: \`<h2>\`; subsections: \`<h3>\`. Keep semantic hierarchy (avoid jumping from \`<h1>\` to \`<h3>\` without a parent \`<h2>\` concept) **except** in **16 Conclusions** mode: there, after \`<h1>\` and dek \`<p>\` blocks, **sixteen** numbered sibling \`<h3>\` items (1–16) follow directly; use \`<h2>\` only for add-ons such as LOOP **Social reaction & video clips**.
- Wrap paragraphs in \`<p>\`.
- Use \`<strong>\` for scannable emphasis (club or player names on first mention in a section, scorelines, pivotal moments) — sparingly; never bold whole paragraphs.
- Lists: \`<ul>\`/\`<ol>\` with \`<li>\`.
- Links: \`<a href="URL" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>\`.
- Tables when useful (e.g. player ratings): \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, \`<td>\`.
- Illustrations: \`<img src="URL" alt="descriptive alt text" loading="lazy" />\` **only** when the feed supplies an image URL — never invent \`src\`.
- **Do not** use Markdown (\`#\`, \`##\`, \`**bold**\`, \`[text](url)\`). **Do not** use \`<iframe>\` or \`<script>\`.
`;

const LOOP_FEED_SYSTEM_APPEND = `

LOOP FEED / SOCIAL INPUT (when LOOP_FEED_EDITOR_DIGEST and LOOP_FEED_JSON appear in the user message):
- **LOOP_FEED_EDITOR_DIGEST** lists posts in plain language — use **postUrl** values in HTML **\`<a href="postUrl" target="_blank" rel="noopener noreferrer">label</a>\`**. **LOOP_FEED_JSON** is structured detail; digest takes priority for readability.
- These posts are **third-party social / editorial snippets** for extra colour, quotes-in-prose, and **video/link embeds** — they do **not** replace FIXTURE_JSON for official facts (score, scorers, cards, VAR outcomes). If social copy conflicts with FIXTURE_JSON, trust FIXTURE_JSON.
- **BBC / Sky-style “push” angles:** when digest items carry **editorialSignals** like records/milestones, controversy, farewell or last-gasp narrative, or posts come from **named reporters** (@handle), treat those as **standfirst / dek candidates** — foreground the strongest hook **after** an accurate result led **only if** FIXTURE_JSON supports it (e.g. scorer named in both). Short attributed paraphrase is fine; **never** fabricate quotes — only wording clearly present in the post snippet.
- When the **PRIORITY REPORTERS** block lists handles or Loop topics, **match or overlap** with LOOP_FEED authors → weight those posts higher for standfirsts, transfer context (still factual / attributed), and quotes-in-prose.
- Attribute closely echoed wording to the source (**author name or @handle** when supplied).
- **Goal / red-card / VAR / highlight clips:** whenever the digest marks **VIDEO EMBED (direct file)** for a post tied to goals, sendings-off, VAR/reviews, or obvious highlight language, you **must** include that HTML **\`<video controls preload="metadata" playsinline width="100%" src="…"></video>\`** in the article (typically under an \`<h2>Social reaction & video clips</h2>\` section, optionally repeated once beside Key moments). Copy **src** exactly from the digest — **no iframe**.
- **Platform-only video** (digest says “platform URL”): HTML links **\`<a href="mediaUrl" …>Watch clip</a>\`** and **\`<a href="postUrl" …>Original post</a>\`** — still no iframe.
- Always include the canonical social link alongside video embeds when **postUrl** is supplied.
- **Photos / thumbnails:** \`<img src="imageUrl" alt="caption" loading="lazy" />\` **only** for supplied **photo** URLs — never invent URLs.
- Omit repetitive boilerplate posts that add no match narrative.
`;

const FOOTBALL365_HOUSE_CUES_APPEND = `

OPTIONAL HOUSE STYLE — Planet Football365 / F365 Features cadence (tone and headline shape only — all match facts still from FIXTURE_JSON):
- Headlines often stack comma-separated hooks (players, managers, motifs such as VAR, set-pieces, league stakes).
- Confident, conversational British football prose; punch allowed when grounded in the feed — never invent controversy or quotes.
`;

function matchCopyBasePrompt(mode: MatchCopyMode): string {
  switch (mode) {
    case "preview":
      return MATCH_PREVIEW_PLANET_SPORT_PROMPT;
    case "report":
      return MATCH_REPORT_PLANET_SPORT_PROMPT;
    case "sixteen_conclusions":
      return MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT;
  }
}

function userClosingLine(mode: MatchCopyMode): string {
  const htmlTail = " as **HTML** only (see OUTPUT FORMAT in system). British English.";
  if (mode === "preview") return `Produce a complete match preview${htmlTail}`;
  if (mode === "sixteen_conclusions") {
    return `Produce a complete Football365-style **16 Conclusions** article${htmlTail} Include **exactly sixteen** numbered conclusion headings (\`<h3>\`), **1** through **16**, each with supporting \`<p>\` paragraphs, following the **16 Conclusions** system prompt.`;
  }
  return `Produce a complete match report${htmlTail}`;
}

async function openAiChatMarkdown(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OpenAI API key is not configured (Language Studio / Admin or OPENAI_API_KEY env).");
  }
  const settings = await readStoredSettingsAsync();
  const model =
    settings.languageOpenaiModel?.trim() ||
    process.env.LANGUAGE_OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `OpenAI request failed (${res.status})`);
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }
  return text;
}

/** Generates Data Studio copy as a WordPress-ready HTML fragment (preview, match report, or 16 Conclusions). */
export async function generateMatchArticleMarkdown(opts: {
  mode: MatchCopyMode;
  fixturePayload: unknown;
  includePlayerRatings?: boolean;
  /** Voice / notes from Language Studio journalist profile — facts still feed-only. */
  journalistNotes?: string;
  /** Match-day Loop Feed snapshot for post-match modes (optional). */
  loopFeedContext?: LoopFeedContext;
  /** Sport-specific priority reporters brief from Tools (optional). */
  priorityReportersBrief?: string;
  /** Planet Football365 headline/rhythm cues — tone only. */
  football365ToneBoost?: boolean;
}): Promise<string> {
  let system = matchCopyBasePrompt(opts.mode);

  system += WORDPRESS_HTML_OUTPUT_APPEND;

  if (opts.football365ToneBoost) {
    system += FOOTBALL365_HOUSE_CUES_APPEND;
  }

  if (opts.priorityReportersBrief?.trim()) {
    system += `

PRIORITY REPORTERS (Tools → Loop Feed priority reporters — same sport as this Data Studio vertical):
${opts.priorityReportersBrief.trim()}`;
  }

  const isPostMatch = opts.mode === "report" || opts.mode === "sixteen_conclusions";
  const loopFeed =
    isPostMatch &&
    opts.loopFeedContext &&
    Array.isArray(opts.loopFeedContext.sides) &&
    opts.loopFeedContext.sides.length > 0
      ? opts.loopFeedContext
      : undefined;

  if (loopFeed) {
    system += LOOP_FEED_SYSTEM_APPEND;
  }

  const loopPostCount =
    loopFeed?.sides?.reduce((acc, s) => acc + (Array.isArray(s.posts) ? s.posts.length : 0), 0) ?? 0;
  const loopMinOutboundLinks = loopPostCount > 0 ? Math.min(3, loopPostCount) : 0;
  const loopStandout = Boolean(loopFeed && loopFeedHasStandoutAngles(loopFeed));
  const loopDirectIncidentVideo = Boolean(loopFeed && loopFeedHasDirectIncidentVideos(loopFeed));
  if (loopPostCount > 0) {
    system += `

MANDATORY OUTPUT — LOOP_FEED_EDITOR_DIGEST lists ${loopPostCount} curated post(s):
You MUST add an \`<h2>Social reaction & video clips</h2>\` section. Include **at least ${loopMinOutboundLinks}** distinct outbound links using HTML **\`<a href="postUrl" target="_blank" rel="noopener noreferrer">label</a>\`** with **href** copied verbatim from the digest (link **every** post when editorially useful). Prioritise entries with **video** media or **editorialSignals** (goals, VAR/discipline, highlights, records, controversy). Credit **author** / **@handle** where supplied.

**Video / discipline:** For **every** digest line labelled **VIDEO EMBED (direct file)** on a goal/send-off/VAR/highlight-related item, you MUST include that full **\`<video controls preload="metadata" playsinline width="100%" src="…"></video>\`** block in the article (same section as above unless you also repeat once beside Key moments for clarity). Do not skip direct-file embeds when the feed supplies them.${loopDirectIncidentVideo ? " **At least one** such embed is required this run." : ""} Before that \`<h2>\`, weave **at least one** \`<p>\` sentence of social-derived colour (prefer **two or more** when multiple posts offer distinct angles). Facts and scoreline remain governed by FIXTURE_JSON.${
      loopStandout
        ? `

STANDFIRST / DEK — LOOP_FEED includes standout angles (see digest header): lead with the **result**, then in the **standfirst or opening paragraph** surface **one** compelling storyline from the **top digest lines** (record/milestone, controversy, farewell, thriller framing) with attribution — do **not** bury that hook only in the social section.`
        : ""
    }`;
  }

  if (opts.mode === "report" && opts.includePlayerRatings === false) {
    system += `

EDITOR OVERRIDE:
- Do not include a numeric player-ratings table or 1–10 scores.
- You may still name standout performers in prose if supported by the feed.`;
  } else if (opts.mode === "report") {
    system += `

EDITOR REMINDER:
- Numeric ratings (when produced): cover **both** sides — home and away — with matching depth whenever both line-ups exist in FIXTURE_JSON. Present ratings as an HTML **\`<table>\`** or structured **\`<h3>\`** blocks per team — never raw Markdown tables.`;
  }

  if (opts.journalistNotes?.trim()) {
    system += `

JOURNALIST STYLE (voice, pacing, formatting habits — do not invent facts or quotes):
${opts.journalistNotes.trim()}`;
  }

  const raw = JSON.stringify(opts.fixturePayload);
  const fixtureBlock =
    raw.length > MAX_FIXTURE_JSON_CHARS
      ? `${raw.slice(0, MAX_FIXTURE_JSON_CHARS)}\n\n… [truncated — payload was ${raw.length} characters]`
      : raw;

  const loopRaw = loopFeed ? JSON.stringify(loopFeed) : "";
  const loopBlock =
    loopRaw.length > MAX_LOOP_FEED_JSON_CHARS
      ? `${loopRaw.slice(0, MAX_LOOP_FEED_JSON_CHARS)}\n\n… [truncated — loop payload was ${loopRaw.length} characters]`
      : loopRaw;

  const digestBlock =
    isPostMatch && loopFeed && loopPostCount > 0 ? loopFeedEditorDigest(loopFeed) : "";

  const loopBlocksWhenPostsFirst =
    isPostMatch && loopPostCount > 0
      ? `The blocks appear in reading order: **Loop social first**, then **fixture facts**.

---

LOOP_FEED_EDITOR_DIGEST (read first — curated social posts; build links as HTML \`<a href="postUrl">…</a>\`):

${digestBlock}

---

LOOP_FEED_JSON (structured snapshot — same posts as digest):

${loopBlock}

---

FIXTURE_JSON (source of truth for match facts — scores, timeline, line-ups; do not invent):

${fixtureBlock}`
      : "";

  const loopSectionTrailing =
    isPostMatch && !(loopPostCount > 0)
      ? `

---

LOOP_FEED_JSON (match-day curated social — **supplementary**; attribution + outbound clips only; see system):

${loopBlock || "(none)"}`
      : "";

  const closing = userClosingLine(opts.mode);
  const user =
    loopBlocksWhenPostsFirst
      ? `${loopBlocksWhenPostsFirst}

---

${closing}`
      : `FIXTURE_JSON (source of truth — use only these facts; do not invent):

${fixtureBlock}${loopSectionTrailing}

---

${closing}`;

  return openAiChatMarkdown(system, user);
}
