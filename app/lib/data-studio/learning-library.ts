import type { LearningLibraryEntry } from "@/app/lib/data-studio/types";

/**
 * Curated references for tone and structure — editorial learning only.
 * Prefer importing owned/partner URLs via Language Studio; public BBC links are for study, not scraping.
 */
export const LEARNING_LIBRARY_ENTRIES: LearningLibraryEntry[] = [
  {
    id: "data-studio-feed-widgets",
    kind: "article_style",
    name: "Data Studio — Feed ↔ widgets matrix",
    description:
      "Football365 mobile tabs (Summary, Commentary, Stats, Line-ups, Table, H2H) and web-preview modules mapped to typical SportccFixture-style clusters.",
    url: "/data-studio",
    verticals: ["football", "multi"],
    notes: "Open Data Studio and scroll to \"Feed ↔ Football365 widgets\". Confirm field names against your live JSON.",
  },
  {
    id: "bbc-football-live-style",
    kind: "site",
    name: "BBC Sport — live / match report rhythm",
    description:
      "Reference for concise British match summaries, moment-by-moment flow and ratings-style framing (learning only — check rights before repurposing prose).",
    url: "https://www.bbc.co.uk/sport/football",
    verticals: ["football", "multi"],
    notes: "Use live report layout as a structural guide; facts must still come from your feed or owned copy.",
  },
  {
    id: "football365-partner-style",
    kind: "brand",
    name: "Football365",
    description:
      "Planet Sport football news baseline — short paras, strong hooks, club context. Aligns with Language Studio source brands and journalist profiles.",
    url: "https://www.football365.com",
    verticals: ["football", "multi"],
    notes: "Import partner RSS / URLs through Language Studio Imports when configured.",
  },
  {
    id: "racing365-brand",
    kind: "brand",
    name: "Racing365",
    description:
      "Planet Sport horse racing baseline — meetings, racecards, tipping rhythm and odds-aware prose without inventing prices.",
    url: "https://www.racing365.com",
    verticals: ["horse_racing", "multi"],
    notes: "Pair with Language Studio source brands and journalist profiles for Racing365 cadence.",
  },
  {
    id: "bbc-horse-racing",
    kind: "site",
    name: "BBC Sport — Horse Racing",
    description:
      "Big-meeting and results-led rhythm; useful structure for recap copy when facts come from your feed.",
    url: "https://www.bbc.co.uk/sport/horse-racing",
    verticals: ["horse_racing", "multi"],
    notes: "Learning reference only — rights differ from partner Racing365 copy.",
  },
  {
    id: "football365-match-preview-example",
    kind: "article_style",
    name: "Football365 — match preview layout",
    description:
      "Reference spine: intro stakes, kick-off time, how to watch, team news (both sides), odds, prediction + highlighted callout — see Planet Sport builtin prompt \"Match preview\".",
    url: "https://www.football365.com/match-preview/arsenal-v-burnley-prediction-preview",
    verticals: ["football", "multi"],
    notes: "Partner-owned pattern; use Data Studio / Prompts templates for generation, not scraped prose.",
  },
  {
    id: "football365-16-conclusions-series",
    kind: "article_style",
    name: "Football365 — 16 Conclusions (post-match)",
    description:
      "Opinion-led match analysis as sixteen numbered takes: compound headline with comma-hooks, sharp verdict paras — useful shape for Data Studio \"16 conclusions\" after full-time.",
    url: "https://www.football365.com/tag/16-conclusions",
    verticals: ["football", "multi"],
    notes:
      "Study tone and structure only. Paste owned/partner URLs into Language Studio Imports when allowed; pair with builtin \"Data Studio — 16 conclusions\" and optional Football365 tone cues on the fixture panel.",
  },
  {
    id: "teamtalk-partner-style",
    kind: "brand",
    name: "TEAMtalk",
    description:
      "Transfer and news-led angles; conversational headline rhythm with clear attribution habits.",
    url: "https://www.teamtalk.com",
    verticals: ["football", "multi"],
    notes: "Pair with Journalists / Prompt Rules in Language Studio for consistent voice.",
  },
  {
    id: "planet-football-features",
    kind: "brand",
    name: "Planet Football",
    description:
      "Feature-weighted football storytelling — scene-setting and narrative pace for longer reads.",
    verticals: ["football", "multi"],
    notes: "Use Knowledge Files for recurring editorial lessons alongside this reference.",
  },
  {
    id: "bbc-rugby-union",
    kind: "site",
    name: "BBC Sport — Rugby Union",
    description: "Union recap tone: set-piece emphasis, score flow, key performers.",
    url: "https://www.bbc.co.uk/sport/rugby-union",
    verticals: ["rugby_union", "multi"],
    notes: "Learning reference for structure; data from your feeds.",
  },
  {
    id: "bbc-rugby-league",
    kind: "site",
    name: "BBC Sport — Rugby League",
    description: "League match rhythm and territorial phases in copy.",
    url: "https://www.bbc.co.uk/sport/rugby-league",
    verticals: ["rugby_league", "multi"],
    notes: "Learning reference only.",
  },
  {
    id: "bbc-cricket",
    kind: "site",
    name: "BBC Sport — Cricket",
    description: "Session summaries, partnerships and bowling spells — useful for innings-led reports.",
    url: "https://www.bbc.co.uk/sport/cricket",
    verticals: ["cricket", "multi"],
    notes: "Learning reference only.",
  },
  {
    id: "bbc-tennis",
    kind: "site",
    name: "BBC Sport — Tennis",
    description: "Match progression, breakpoints and serve narrative patterns.",
    url: "https://www.bbc.co.uk/sport/tennis",
    verticals: ["tennis", "multi"],
    notes: "Learning reference only.",
  },
  {
    id: "bbc-f1",
    kind: "site",
    name: "BBC Sport — Formula 1",
    description: "Session reporting: grid, tyre/stint beats, stewarding context.",
    url: "https://www.bbc.co.uk/sport/formula1",
    verticals: ["f1", "multi"],
    notes: "Learning reference only.",
  },
  {
    id: "prompts-match-preview-report-builtins",
    kind: "article_style",
    name: "Prompts — Match preview, report & 16 conclusions (built-ins)",
    description:
      "Planet Sport templates: preview spine for all verticals, match reports that reuse preview context when facts still align, and sixteen numbered conclusion blocks for Football365-style analysis.",
    url: "/prompts",
    verticals: ["multi"],
    notes:
      "Look for \"Data Studio\" entries: Match preview (Planet Sport), Match report (with preview context), and Data Studio — 16 conclusions (Planet Sport).",
  },
  {
    id: "language-studio-imports",
    kind: "article_style",
    name: "Language Studio — Imports",
    description:
      "Bring Football365 feeds, URLs and API items into the rewrite → translation pipeline.",
    url: "/language-studio?tab=Imports",
    verticals: ["multi"],
    notes: "Primary path for live partner article imports.",
  },
  {
    id: "language-studio-journalists",
    kind: "article_style",
    name: "Language Studio — Journalists",
    description:
      "Per-creator and brand style notes that combine with Prompt Rules on rewrite and translation.",
    url: "/language-studio?tab=Journalists",
    verticals: ["multi"],
    notes: "Mirror Football365 / TEAMtalk writer cadence here.",
  },
  {
    id: "language-studio-knowledge",
    kind: "article_style",
    name: "Language Studio — Knowledge Files",
    description:
      "Reusable editorial lessons, corrections and brand-specific guidance for models and editors.",
    url: "/language-studio?tab=Knowledge%20Files",
    verticals: ["multi"],
    notes: "Extend this catalogue into actionable snippets the pipeline can retrieve.",
  },
];

export function learningKindLabel(kind: LearningLibraryEntry["kind"]): string {
  switch (kind) {
    case "article_style":
      return "Article / workflow";
    case "site":
      return "Site (reference)";
    case "brand":
      return "Brand";
    default:
      return kind;
  }
}
