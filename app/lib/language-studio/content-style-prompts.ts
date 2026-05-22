import type { LanguageContentStyle } from "@/app/lib/language-studio/types";

const LINK_GUIDANCE =
  "Remove internal links to the source site (nav hubs, tips indexes, racecards, homepages); keep only essential external factual links.";

/** Default STYLE textarea copy for Language Studio rewrite — one prompt per content style preset. */
export const DEFAULT_REWRITE_STYLE_BY_CONTENT_STYLE: Record<LanguageContentStyle, string> = {
  News:
    "Original news rewrite for Google: lead with the biggest fact, keep a neutral expert sports tone, short paragraphs, quotes early, context after. No synonym spinning or padded intro. " +
    LINK_GUIDANCE,
  Transfer:
    "Transfer rewrite for Google: open with the move or strongest rumour line, deal status and source strength up front, then fee, contract, rivals and timing only when in the source. No invented agreements. " +
    LINK_GUIDANCE,
  Opinion:
    "Opinion rewrite for Google: open with a clear editorial line, build an argument with evidence from the source, land a sharp conclusion. Personality-led and punchy — do not invent facts or quotes. " +
    LINK_GUIDANCE,
  Preview:
    "Preview rewrite for Google: set up what is about to happen — stakes, form, key battles and a measured verdict. Analytical tone; no results or outcomes not in the source. " +
    LINK_GUIDANCE,
  "Match preview":
    "Match preview rewrite for Google: fixture stakes, schedule, venue, team news both sides, key match-ups and a pre-kick-off verdict. Never invent line-ups, injuries or odds. " +
    LINK_GUIDANCE,
  "Match report":
    "Match report rewrite for Google: result and narrative in the intro, then key moments in order (goals, cards, VAR, turning points). Quotes when supplied; table or qualification context when relevant. Factual, sharp tone. " +
    LINK_GUIDANCE,
  "16 Conclusions":
    "16 Conclusions rewrite for Google: compound headline energy, then sixteen numbered takeaway paragraphs — opinion-forward hooks grounded only in source facts. No invented incidents. " +
    LINK_GUIDANCE,
  Review:
    "Review rewrite for Google: result first, turning points and quotes, then what it means. Report what happened — sharp factual tone, no speculation beyond the source. " +
    LINK_GUIDANCE,
  Analysis:
    "Analysis rewrite for Google: explain the why — tactical or data-led breakdown, insight-driven structure, teach the reader something new from the source material only. " +
    LINK_GUIDANCE,
  Feature:
    "Feature rewrite for Google: narrative opening, wider angle and more colour while staying faithful to the source. Longer form, human and story-led — no invented scenes or quotes. " +
    LINK_GUIDANCE,
  Live:
    "Live rewrite for Google: fast, update-style prose — clear sequence, timestamps or moment order where useful, immediate relevance. Concise context; no padding. " +
    LINK_GUIDANCE,
  Tips:
    "Tips rewrite for Google: clear selections and reasoning, value angles and risk caveats only when the source supports them. Practical reader-first tone — never invent odds, offers or outcomes. " +
    LINK_GUIDANCE,
};

export function defaultRewriteStyleForContentStyle(style: LanguageContentStyle): string {
  return DEFAULT_REWRITE_STYLE_BY_CONTENT_STYLE[style] ?? DEFAULT_REWRITE_STYLE_BY_CONTENT_STYLE.News;
}
