import { RUNWAY_T2I_PROMPT_MAX } from "@/app/lib/runway-text-to-image-constants";

/** OpenAI Images API — conservative prompt cap */
export const OPENAI_IMAGE_PROMPT_MAX = 4000;

export type ArticleHeroSource = {
  title: string;
  body: string;
  standfirst: string;
  category?: string;
  tags?: string[];
};

export const F365_BRAND_CYAN = "#60CAEA";

/** Creative brief shown in UI — prompts below substitute live fields from the article. */
export const F365_MATCH_REPORT_SPEC = `Football365 match-report hero — 1280×720 (16:9). Stadium background (venue from article), blur 15–25%, charcoal overlay, post-match mood. Home crest top-left, away crest top-right, score panel between. Brand: Football365 editorial — panels #071326 / #111111 — accent EXACTLY ${F365_BRAND_CYAN} — headline ${F365_BRAND_CYAN}, secondary white — NO yellow or gold. Punchy 4–8 word uppercase headline from article; secondary line Match Report / Player Ratings / Reaction. Optional hero player cut-out with soft cyan glow. Refs: Football365, ESPN FC, The Athletic, Goal. OpenAI preset embeds standfirst + body excerpt for grounding; Runway preset uses a short hook from the same copy.`;

export const F365_PREVIEW_SPEC = `Football365 match-preview hero / YouTube thumbnail — 1280×720 (16:9). Pitch-corner stadium, wide angle, blur 10–20%, subtle charcoal overlay; grass + corner flag visible; premium editorial atmosphere. Two crests top area — home left, away right, modest size, small gap, above headline blocks. Two stacked left-aligned rounded dark panels (#071326 / #111111); line 1 cyan ${F365_BRAND_CYAN}: "{{home_team}} VS" — line 2 cyan: "{{away_team}} {{headline_type}}" (e.g. PREVIEW). Sub-line white optional: "{{preview_subline}}" + thin cyan accent + soft glow rgba(96,202,234,0.25). Typography: heavy condensed uppercase (Bebas/Oswald/DIN feel), tight spacing, slight shadow. Competition / kick-off from article when known. NO yellow/gold, NO sponsors, NO arrows, minimal clutter. OpenAI preset uses article excerpt; Runway uses a short hook.`;

/** Soft cyan rim glow (Football365 preview cards). */
export const F365_PREVIEW_GLOW_RGBA = "rgba(96,202,234,0.25)";

export type F365HeroVars = {
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  headline: string;
  headline_upper: string;
  competition: string;
  stadium: string;
  hero_player: string;
  secondary_line: string;
};

/** Variables for preview / YouTube thumbnail prompts. */
export type F365PreviewVars = {
  home_team: string;
  away_team: string;
  headline_type: string;
  competition: string;
  stadium: string;
  match_time: string;
  preview_subline: string;
};

function clampRunway(s: string): string {
  const t = s.trim();
  if (t.length <= RUNWAY_T2I_PROMPT_MAX) return t;
  return `${t.slice(0, RUNWAY_T2I_PROMPT_MAX - 1)}…`;
}

function clampOpenAi(s: string): string {
  const t = s.trim();
  if (t.length <= OPENAI_IMAGE_PROMPT_MAX) return t;
  return `${t.slice(0, OPENAI_IMAGE_PROMPT_MAX - 1)}…`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** On-image headline: punchy 4–8 words, uppercase (Football365 cards). */
export function punchyHeadlineUpper(headline: string, maxWords = 8): string {
  const words = headline
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const clipped = words.length > maxWords ? words.slice(0, maxWords) : words;
  return clipped.join(" ").toUpperCase();
}

function articleExcerptForPrompt(standfirst: string, body: string, maxChars: number): string {
  const s = stripHtml(standfirst ?? "").trim();
  const b = stripHtml(body ?? "").trim();
  const combined = [s, b].filter(Boolean).join("\n\n");
  if (combined.length <= maxChars) return combined;
  return `${combined.slice(0, maxChars - 1)}…`;
}

/** Plain excerpt for Runway (short prompt budget). */
export function f365RunwayArticleHook(article: Pick<ArticleHeroSource, "standfirst" | "body">): string {
  return articleExcerptForPrompt(article.standfirst ?? "", article.body ?? "", 280);
}

/** Scoreline in title: "Leeds United 1-0 Brighton" or with subtitle after away team */
export function parseFixtureFromTitle(title: string): Partial<Pick<F365HeroVars, "home_team" | "away_team" | "home_score" | "away_score">> {
  const m = title.trim().match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([^:]+?)(?::|$)/);
  if (!m) return {};
  return {
    home_team: m[1].trim(),
    home_score: m[2],
    away_score: m[3],
    away_team: m[4].trim(),
  };
}

/**
 * Preview titles without scores: "Aston Villa vs Liverpool", "Leeds v Arsenal: Preview".
 * If the title contains a scoreline, delegates to {@link parseFixtureFromTitle}.
 */
export function parseVsTeamsFromTitle(title: string): Partial<Pick<F365HeroVars, "home_team" | "away_team">> {
  const t = title.trim();
  const scored = parseFixtureFromTitle(t);
  if (scored.home_team && scored.away_team) {
    return { home_team: scored.home_team, away_team: scored.away_team };
  }
  const m = t.match(/^(.+?)\s+(?:vs\.?|v\.?)\s+(.+?)(?::|\||\s-\s|$)/i);
  if (!m) return {};
  const away = m[2]
    .replace(/\s*(preview|predictions?|team news|match preview).*$/i, "")
    .trim();
  return { home_team: m[1].trim(), away_team: away };
}

function stadiumGuess(body: string): string {
  const m = body.match(/\b(?:at|@)\s+([A-Za-z0-9'\s-]{4,80}?)(?:\.|,|<|\n|$)/i);
  return m ? m[1].trim() : "the actual match stadium";
}

function heroPlayerGuess(body: string): string {
  const m = body.match(/\b(?:goal from|scored by|winner from)\s+([A-Za-z][\w'-]+\s+[A-Za-z][\w'-]+)/i);
  return m ? m[1].trim() : "";
}

function secondaryFromArticle(article: Pick<ArticleHeroSource, "category" | "tags">): string {
  const c = (article.category ?? "").toLowerCase();
  const tags = (article.tags ?? []).join(" ").toLowerCase();
  if (c.includes("preview") || tags.includes("preview")) return "Match Preview | Premier League";
  if (c.includes("rating") || tags.includes("rating")) return "Player Ratings | Match Report";
  if (c.includes("16 conclusion") || tags.includes("16-conclusions")) return "Reaction & Analysis";
  return "Match Report | Premier League";
}

function competitionGuess(article: Pick<ArticleHeroSource, "tags" | "standfirst" | "body">): string {
  const blob = `${article.tags?.join(" ") ?? ""} ${article.standfirst} ${article.body}`.toLowerCase();
  if (blob.includes("premier league")) return "Premier League";
  if (blob.includes("champions league")) return "Champions League";
  if (blob.includes("fa cup")) return "FA Cup";
  if (blob.includes("efl")) return "EFL";
  return "Premier League";
}

function previewHeadlineTypeFromArticle(article: Pick<ArticleHeroSource, "title" | "tags" | "category">): string {
  const blob = `${article.title} ${article.tags?.join(" ") ?? ""} ${article.category ?? ""}`.toLowerCase();
  if (blob.includes("prediction")) return "PREDICTIONS";
  if (blob.includes("team news")) return "TEAM NEWS";
  return "PREVIEW";
}

function matchTimeGuessFromArticle(article: Pick<ArticleHeroSource, "title" | "body">): string {
  const plainBody = stripHtml(article.body ?? "");
  const blob = `${article.title} ${plainBody}`;
  const hm = blob.match(/\b(\d{1,2}:\d{2})\b/);
  if (hm) return hm[1];
  const pm = blob.match(/\b(\d{1,2})(?::(\d{2}))?\s*pm\b/i);
  if (pm) {
    const mins = pm[2] ?? "00";
    return `${pm[1]}:${mins} PM`;
  }
  const am = blob.match(/\b(\d{1,2})(?::(\d{2}))?\s*am\b/i);
  if (am) {
    const mins = am[2] ?? "00";
    return `${am[1]}:${mins} AM`;
  }
  return "Kick-off TBC";
}

function previewSublineFromArticle(article: Pick<ArticleHeroSource, "tags" | "category" | "title">): string {
  const blob = `${article.title} ${article.tags?.join(" ") ?? ""} ${article.category ?? ""}`.toLowerCase();
  if (blob.includes("prediction") && blob.includes("team news")) return "Preview | Team News | Predictions";
  if (blob.includes("prediction")) return "Preview | Predictions";
  if (blob.includes("team news")) return "Preview | Team News";
  return "Preview | Team News | Predictions";
}

/** Pull a punchy headline line from article HTML/text when title is mostly scoreline. */
function headlineLineFromArticle(article: ArticleHeroSource, parsed: ReturnType<typeof parseFixtureFromTitle>): string {
  if (parsed.home_team && parsed.away_team) {
    const stripped = article.title
      .replace(new RegExp(`^${escapeRegExp(parsed.home_team)}\\s+\\d+\\s*[-–]\\s*\\d+\\s+${escapeRegExp(parsed.away_team)}`, "i"), "")
      .replace(/^[:–-\s]+/, "")
      .trim();
    if (stripped.length >= 8) return stripped.slice(0, 160);
  }
  const h1 = article.body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1?.[1]?.trim()) return h1[1].replace(/<[^>]+>/g, "").trim().slice(0, 160);
  const plain = article.standfirst?.trim() || article.title;
  return plain.slice(0, 160);
}

/** Derive template variables from the source article (feeds Runway + OpenAI prompts). */
export function f365HeroVarsFromArticle(article: ArticleHeroSource): F365HeroVars {
  const parsed = parseFixtureFromTitle(article.title);
  const vsTeams = parseVsTeamsFromTitle(article.title);
  const headline = headlineLineFromArticle(article, parsed);
  const headline_upper = headline.toUpperCase().slice(0, 120);
  return {
    home_team: parsed.home_team ?? vsTeams.home_team ?? "Home Club",
    away_team: parsed.away_team ?? vsTeams.away_team ?? "Away Club",
    home_score: parsed.home_score ?? "?",
    away_score: parsed.away_score ?? "?",
    headline: headline.slice(0, 200),
    headline_upper,
    competition: competitionGuess(article),
    stadium: stadiumGuess(article.body ?? ""),
    hero_player: heroPlayerGuess(article.body ?? ""),
    secondary_line: secondaryFromArticle(article),
  };
}

/** Preview / thumbnail variables from article (teams, kick-off, headline row type). */
export function f365PreviewVarsFromArticle(article: ArticleHeroSource): F365PreviewVars {
  const base = f365HeroVarsFromArticle(article);
  return {
    home_team: base.home_team,
    away_team: base.away_team,
    headline_type: previewHeadlineTypeFromArticle(article),
    competition: base.competition,
    stadium: base.stadium,
    match_time: matchTimeGuessFromArticle(article),
    preview_subline: previewSublineFromArticle(article),
  };
}

function truncateOneLine(s: string, maxChars: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= maxChars ? t : `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function dedupeKeywordList(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const x = raw.trim();
    if (!x) continue;
    const key = x.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

/**
 * Short Media Library keywords only: teams (or headline when no fixture parse), player when inferred,
 * and competition + headline row type — avoids dumping full titles and tag lists.
 */
export function compactLibraryImageKeywords(
  article: Pick<ArticleHeroSource, "title" | "body" | "standfirst" | "category" | "tags">,
  options?: { appendToEvent?: string },
): string[] {
  const v = f365HeroVarsFromArticle(article);
  const p = f365PreviewVarsFromArticle(article);
  const teamsArePlaceholder = v.home_team === "Home Club" && v.away_team === "Away Club";
  const team = teamsArePlaceholder ? truncateOneLine(article.title, 100) : `${v.home_team} vs ${v.away_team}`;
  const player = v.hero_player.trim();
  let event = [v.competition, p.headline_type].filter(Boolean).join(" · ");
  const extra = options?.appendToEvent?.trim();
  if (extra) event = event ? `${event} · ${extra}` : extra;
  return dedupeKeywordList([team, player, event].filter(Boolean));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function crestHint(team: string): string {
  return `Official-style ${team} football club crest/logo (recognisable colours), crisp silhouette`;
}

/**
 * Full Football365 match-report brief with article fields inlined — for OpenAI Images (longer prompt budget).
 * Uses brand cyan #60CAEA only — no yellow.
 * Pass `article` so the model can ground mood and story in the real piece (excerpt only).
 */
export function buildF365MatchReportOpenAiPrompt(
  v: F365HeroVars,
  article?: Pick<ArticleHeroSource, "standfirst" | "body">,
): string {
  const headlineHero = punchyHeadlineUpper(v.headline, 8);
  const scorePanel = `${v.home_team} ${v.home_score} - ${v.away_score} ${v.away_team}`;
  const playerBlock = v.hero_player.trim()
    ? `Optional foreground: isolated cut-out of ${v.hero_player} celebrating or reacting — overlaps headline slightly — soft glow in Football365 cyan ${F365_BRAND_CYAN} — dynamic pose.`
    : `Optional foreground: one match-deciding player cut-out celebrating — soft cyan ${F365_BRAND_CYAN} rim glow — overlaps headline slightly.`;

  const excerpt =
    article &&
    (article.standfirst?.trim() || article.body?.trim()) &&
    articleExcerptForPrompt(article.standfirst ?? "", article.body ?? "", 2200);

  const excerptBlock = excerpt
    ? `

Source article (tone and factual grounding — do not contradict the scoreline or club names above; use for mood, stakes, and visual storytelling only):
"""
${excerpt}
"""
`
    : "";

  const text = `
Create a Football365-style Match Report hero image tied to this fixture.

Article-derived facts (must respect these names, score and tone):
- Home: ${v.home_team}. Away: ${v.away_team}.
- Scoreline: ${v.home_score} - ${v.away_score}.
- Competition: ${v.competition}.
- Venue / atmosphere: ${v.stadium}.
- Main headline wording (large dominant uppercase, aim for roughly 4–8 words): "${headlineHero}".
- Secondary line (smaller, white): "${v.secondary_line}".
- Key player thread (if relevant): ${v.hero_player.trim() || "infer only subtle cues from headline; do not invent a named player portrait if unclear"}.
${excerptBlock}
Canvas: 1280x720 (16:9).

Background:
- Full stadium from the actual match venue where possible (${v.stadium}).
- Slight blur (15–25%).
- Dark charcoal overlay for contrast — keep pitch and crowd visible.
- Post-match atmosphere — floodlights, celebrations or reactions allowed — strong depth and stadium lighting.

Top layout:
- ${crestHint(v.home_team)} — TOP LEFT.
- ${crestHint(v.away_team)} — TOP RIGHT.
- Small score panel BETWEEN the crests showing exactly: ${scorePanel}.

Football365 brand style:
- Modern Football365 editorial look.
- Dark charcoal / near-black panels (#071326 or #111111).
- Primary accent EXACTLY Football365 cyan/turquoise ${F365_BRAND_CYAN} — use nowhere else as a second unrelated hue.
- Headline text colour ${F365_BRAND_CYAN}; secondary/supporting text #FFFFFF; thin accent rules/dividers ${F365_BRAND_CYAN}.
- High contrast, sharp blocks, digital editorial — like Football365 social/feature cards.
- Do NOT use yellow or gold anywhere.

Typography:
- Heavy condensed sports font; uppercase headline; tight spacing; subtle shadow; excellent readability.

${playerBlock}

Style references: Football365, ESPN FC, The Athletic social cards, Goal.

Avoid: sponsor logos, clickbait arrows, random effects, excessive gradients, clutter.
`.trim();

  return clampOpenAi(text);
}

/** Runway Gen-4 — compressed, article-specific, cyan brand only. Optional hook ties to article prose (short). */
export function buildF365MatchReportRunwayPrompt(
  v: F365HeroVars,
  opts?: { narrativeHook?: string },
): string {
  const headlineHero = punchyHeadlineUpper(v.headline, 8);
  const score = `${v.home_team} ${v.home_score}-${v.away_score} ${v.away_team}`;
  const playerBit = v.hero_player.trim()
    ? ` Cut-out ${v.hero_player.slice(0, 40)} cyan glow ${F365_BRAND_CYAN}.`
    : "";
  const hookRaw = (opts?.narrativeHook ?? "").trim().replace(/\s+/g, " ");
  const hook =
    hookRaw.length > 0
      ? ` Article hook: ${hookRaw.slice(0, 160)}${hookRaw.length > 160 ? "…" : ""}`
      : "";
  return clampRunway(
    [
      `16:9 1280x720 Football365 MATCH REPORT hero.`,
      `Fixture ${v.home_team} vs ${v.away_team} score ${v.home_score}-${v.away_score} · ${v.competition} · ${v.stadium}.${hook}`,
      `Stadium BG blurred 20% charcoal overlay post-match crowd pitch floodlights depth.`,
      `Crests: ${v.home_team} TL ${v.away_team} TR; score strip centre "${score}".`,
      `Brand ONLY cyan accent ${F365_BRAND_CYAN} NO yellow gold; panels #071326/#111111; headline ${F365_BRAND_CYAN} uppercase "${headlineHero.slice(0, 72)}"; subline white "${v.secondary_line.slice(0, 48)}".`,
      `Premium editorial Goal ESPN Athletic card.${playerBit}`,
      `No sponsors arrows clutter.`,
    ].join(" "),
  );
}

/**
 * Football365 match-preview hero / YouTube thumbnail — OpenAI Images (full brief + optional article excerpt).
 * Brand cyan #60CAEA only — no yellow.
 */
export function buildF365PreviewOpenAiPrompt(
  v: F365PreviewVars,
  article?: Pick<ArticleHeroSource, "standfirst" | "body">,
): string {
  const row1 = `${v.home_team.toUpperCase()} VS`;
  const row2 = `${v.away_team.toUpperCase()} ${v.headline_type}`;
  const excerpt =
    article &&
    (article.standfirst?.trim() || article.body?.trim()) &&
    articleExcerptForPrompt(article.standfirst ?? "", article.body ?? "", 2000);

  const excerptBlock = excerpt
    ? `

Source article (fixture context and tone — do not contradict club names or competition below):
"""
${excerpt}
"""
`
    : "";

  const text = `
Create a Football365-style football match preview hero card / YouTube thumbnail.

Fixture (use exactly on the graphic):
- Home: ${v.home_team}. Away: ${v.away_team}.
- Competition: ${v.competition}.
- Venue / stadium mood: ${v.stadium}.
- Kick-off / match time label (small supporting text if shown): ${v.match_time}.
- Headline row 1 (large uppercase, cyan): "${row1}".
- Headline row 2 (large uppercase, cyan): "${row2}".
- Optional small sub-line (white): "${v.preview_subline}".
${excerptBlock}
Canvas: 1280x720 (16:9).

Background:
- Full stadium from pitch corner viewpoint — wide-angle football stadium.
- Slight background blur (10–20%).
- Subtle dark charcoal overlay for contrast — natural stadium colours — strong depth and lighting.
- Keep grass and corner flag visible — stadium stays readable and must not overpower text.

Top section:
- Two club crests near top: ${crestHint(v.home_team)} LEFT — ${crestHint(v.away_team)} RIGHT.
- Small spacing between logos — logos above the headline blocks — modest size, must not dominate.

Headline area:
- Two stacked dark rounded rectangles (#071326 or #111111), left-aligned — strong hierarchy and contrast — large text area.

Football365 brand:
- Primary / headline / accents EXACTLY ${F365_BRAND_CYAN}; supporting text #FFFFFF; thin accent line/dividers ${F365_BRAND_CYAN}.
- Optional soft cyan glow around headline zone: ${F365_PREVIEW_GLOW_RGBA}.
- Editorial digital news look — sharp edges — premium — similar to Football365 social cards, ESPN FC, Goal.
- Do NOT use yellow or gold anywhere.

Typography:
- Heavy condensed sports caps (Bebas Neue / Anton / Oswald Bold / DIN Condensed Bold mood); tight tracking; slight shadow or subtle glow; excellent readability; vertically balanced in blocks.

Optional:
- Thin cyan accent line beneath headline blocks.

Avoid: sponsor logos, clickbait arrows, excessive gradients, random effects, oversized logos, clutter.
`.trim();

  return clampOpenAi(text);
}

/** Preview / thumbnail — Runway Gen-4 compressed; optional article hook. */
export function buildF365PreviewRunwayPrompt(
  v: F365PreviewVars,
  opts?: { narrativeHook?: string },
): string {
  const row1 = `${v.home_team.toUpperCase()} VS`;
  const row2 = `${v.away_team.toUpperCase()} ${v.headline_type}`;
  const hookRaw = (opts?.narrativeHook ?? "").trim().replace(/\s+/g, " ");
  const hook =
    hookRaw.length > 0
      ? ` Hook: ${hookRaw.slice(0, 140)}${hookRaw.length > 140 ? "…" : ""}`
      : "";
  return clampRunway(
    [
      `16:9 1280x720 Football365 MATCH PREVIEW hero YouTube thumbnail cyan ${F365_BRAND_CYAN}.`,
      `${v.home_team} vs ${v.away_team} · ${v.competition} · ${v.stadium} · ${v.match_time}.${hook}`,
      `Corner stadium wide blur 12% charcoal overlay grass corner flag depth.`,
      `Small crests top ${v.home_team} L ${v.away_team} R gap modest.`,
      `Stacked rounded panels #071326/#111111 left; caps cyan "${row1.slice(0, 34)}" "${row2.slice(0, 42)}"; sub white "${v.preview_subline.slice(0, 42)}".`,
      `Accent line cyan ${F365_BRAND_CYAN}; soft glow ${F365_PREVIEW_GLOW_RGBA}; condensed font.`,
      `NO yellow sponsors arrows clutter.`,
    ].join(" "),
  );
}
