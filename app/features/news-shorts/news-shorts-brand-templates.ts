import type { RunwayBgBrand } from "@/app/lib/runway-background-prompt-types";
import type { NewsShortSlide, NewsShortStyleControls, NewsShortTemplateData } from "@/app/features/news-shorts/types";
import { NEWS_SHORT_DEFAULT_STYLE } from "@/app/features/news-shorts/types";

/** Default brand when opening News Shorts (PlanetF1 + Liam-style starter). */
export const DEFAULT_NEWS_SHORT_BRAND_ID = "planetf1";

/** PlanetF1-only bundled motion example (Content preview). */
export const PLANETF1_LIAM_EXAMPLE_BACKDROP_VIDEO_REL =
  "uploads/planetf1-liam-example/f1-liam-lawson-2026-short.mp4";

const BASE_SLIDE_ANIM = {
  durationSec: 5,
  animationStyle: "fade-up" as const,
  backgroundAnimation: "zoom-in" as const,
  backgroundZoom: 1.04,
};

function contentSlide(
  id: string,
  headline: string,
  subline: string,
  highlights: string[],
  durationSec: number,
  zoom: number,
): NewsShortSlide {
  return {
    id,
    type: "content",
    label: "KEY POINT",
    headline,
    subline,
    imageUrl: "",
    highlightWords: highlights,
    durationSec,
    animationStyle: "slide-up",
    backgroundAnimation: "zoom-in",
    backgroundZoom: zoom,
  };
}

function starterSlides(signOff: string, topicWords: string[]): NewsShortSlide[] {
  const [a, b] = topicWords;
  return [
    {
      id: "slide-1",
      type: "intro",
      label: "INTRO",
      headline: "BUILD THIS SHORT FROM A FRESH ARTICLE",
      subline: "Fetch + Parse copies headline, strapline, and beats into these slides.",
      imageUrl: "",
      highlightWords: [a, b, "NEWS"].filter(Boolean),
      ...BASE_SLIDE_ANIM,
    },
    contentSlide(
      "slide-2",
      "KEY STORY BEAT ONE LANDS HERE AFTER PARSE",
      "Edit headline, highlights, and duration once your article is loaded.",
      [a || "STORY", "PARSE"],
      6,
      1.06,
    ),
    contentSlide(
      "slide-3",
      "ADD CONTEXT, QUOTES, OR SECOND BEAT FROM THE PIECE",
      "Use Rewrite article (AI) or edit manually — same engine for every brand.",
      ["CONTEXT", "QUOTE"],
      6,
      1.08,
    ),
    {
      id: "slide-4",
      type: "outro",
      label: "OUTRO",
      headline: "THANKS FOR WATCHING",
      subline: signOff,
      imageUrl: "",
      highlightWords: ["WATCHING", "MORE"],
      durationSec: 5,
      animationStyle: "fade-up",
      backgroundAnimation: "zoom-in",
      backgroundZoom: 1.1,
    },
  ];
}

function mergeStyle(overrides: Partial<NewsShortStyleControls>): NewsShortStyleControls {
  return { ...NEWS_SHORT_DEFAULT_STYLE, ...overrides };
}

export type NewsShortBrandTemplateDefinition = {
  id: string;
  label: string;
  category: string;
  articleUrlPlaceholder: string;
  rssFeedPlaceholder: string;
  /** Optional bundled motion rel (must pass `assertCrossContentBackdropRel`). */
  defaultBackgroundVideoRel?: string;
  buildTemplate: () => NewsShortTemplateData;
};

/** Runway text-to-video / motion AI brand — maps each site to one of the three supported API brands (engine unchanged). */
export function runwayMotionBrandForNewsShortSourceUrl(sourceUrl: string): RunwayBgBrand {
  let host = "";
  try {
    host = new URL(sourceUrl || "about:blank").hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "Racing365";
  }
  if (host.includes("planetf1")) return "PlanetF1";
  if (host.includes("teamtalk")) return "TEAMtalk";
  if (
    host.includes("football365") ||
    host.includes("planetfootball") ||
    host.includes("grassrootgoals")
  ) {
    return "TEAMtalk";
  }
  return "Racing365";
}

function genericBrand(
  id: string,
  label: string,
  category: string,
  host: string,
  signOff: string,
  tags: string[],
  style: Partial<NewsShortStyleControls>,
  notes: string,
): NewsShortBrandTemplateDefinition {
  const articleUrlPlaceholder = `https://www.${host}/news/`;
  return {
    id,
    label,
    category,
    articleUrlPlaceholder,
    rssFeedPlaceholder: `https://www.${host}/feed`,
    buildTemplate: (): NewsShortTemplateData => ({
      brandTemplateId: id,
      sourceType: "url",
      sourceUrl: articleUrlPlaceholder,
      title: `Paste a ${host} article URL, then tap Fetch + Parse`,
      strapline: category,
      author: `${label} desk`,
      publishDate: "",
      heroImage: "",
      articleImages: [],
      tags,
      articleBody: [
        "After you parse, this body text is replaced with real paragraphs from the article.",
        "Use the same SEO, voiceover, I2V, background, style, and subtitle controls as every other brand template.",
        "Scene subtitles, ASS burn, and FFmpeg output behaviour are identical across the network.",
      ],
      keyQuotes: ["Quotes from the article appear here after Fetch + Parse."],
      slides: starterSlides(signOff, tags),
      style: mergeStyle(style),
      notes,
    }),
  };
}

function planetF1Template(): NewsShortTemplateData {
  return {
    brandTemplateId: "planetf1",
    sourceType: "url",
    sourceUrl:
      "https://www.planetf1.com/news/liam-lawson-supercars-move-f1-star-explains-raw-series-dream",
    title: "Liam Lawson reveals why ‘raw’ Supercars dream still appeals beyond F1",
    author: "PlanetF1 staff",
    publishDate: "2026-04-15",
    heroImage: "",
    strapline:
      "Lawson explains what still pulls him toward Supercars beyond F1 — raw cars, big noise, and when he might race.",
    articleImages: [],
    tags: ["F1", "Liam Lawson", "Supercars"],
    articleBody: [
      "Lawson said he would love to race Supercars at some point in his career.",
      "He called the series raw and highlighted V8 naturally aspirated engines and sequential gearboxes.",
      "He also dismissed rumours suggesting he would race during the spring break.",
    ],
    keyQuotes: [
      "I would love to race Supercars at some point.",
      "They are raw. V8 naturally aspirated and sequential gearboxes.",
    ],
    slides: [
      {
        id: "slide-1",
        type: "intro",
        label: "INTRO",
        headline: "LAWSON OPENS UP ON A DREAM MOVE BEYOND F1",
        subline:
          "Lawson explains what still pulls him toward Supercars beyond F1 — raw cars, big noise, and when he might race.",
        imageUrl: "",
        highlightWords: ["LAWSON", "DREAM", "F1"],
        durationSec: 5,
        animationStyle: "fade-up",
        backgroundAnimation: "zoom-in",
        backgroundZoom: 1.04,
      },
      {
        id: "slide-2",
        type: "content",
        label: "KEY POINT",
        headline: "HE SAYS SUPERCARS STILL APPEALS BECAUSE THE CARS FEEL RAW",
        subline: "Potential future move",
        imageUrl: "",
        highlightWords: ["SUPERCARS", "RAW"],
        durationSec: 6,
        animationStyle: "slide-up",
        backgroundAnimation: "zoom-in",
        backgroundZoom: 1.06,
      },
      {
        id: "slide-3",
        type: "content",
        label: "QUOTE / DETAIL",
        headline: "V8 POWER + SEQUENTIAL BOXES BRING AN OLD-SCHOOL DRIVING CHALLENGE",
        subline: "No truth in spring break rumour",
        imageUrl: "",
        highlightWords: ["V8", "SEQUENTIAL", "CHALLENGE"],
        durationSec: 6,
        animationStyle: "soft-pop",
        backgroundAnimation: "zoom-in",
        backgroundZoom: 1.08,
      },
      {
        id: "slide-4",
        type: "outro",
        label: "OUTRO",
        headline: "WOULD LAWSON RACE SUPERCARS IN THE FUTURE?",
        subline: "For more F1 news, head to PlanetF1.com",
        imageUrl: "",
        highlightWords: ["LAWSON", "SUPERCARS"],
        durationSec: 5,
        animationStyle: "fade-up",
        backgroundAnimation: "zoom-in",
        backgroundZoom: 1.1,
      },
    ],
    style: mergeStyle({
      panelColor: "#0f172a",
      highlightColor: "#b7ff1a",
      introLabel: "TOP STORY",
      outroLabel: "NEXT STEPS",
    }),
    notes: "PlanetF1 — F1 news shorts (example story).",
  };
}

/**
 * Ordered Planet Sport News Shorts templates — one object per site/brand, no merged multi-brand rows.
 */
export const NEWS_SHORTS_BRAND_TEMPLATES: readonly NewsShortBrandTemplateDefinition[] = [
  {
    id: "planetf1",
    label: "PlanetF1",
    category: "F1 news shorts",
    articleUrlPlaceholder: "https://www.planetf1.com/news/",
    rssFeedPlaceholder: "https://www.planetf1.com/feed",
    defaultBackgroundVideoRel: PLANETF1_LIAM_EXAMPLE_BACKDROP_VIDEO_REL,
    buildTemplate: planetF1Template,
  },
  genericBrand(
    "football365",
    "Football365",
    "Football news shorts",
    "football365.com",
    "For more football news, visit Football365.com",
    ["Football", "Premier League", "Transfers"],
    {
      /* F365 Shorts: dark glass headline rail, white type, electric cyan highlights (#00E8F0); cyan top accent; white footer. */
      panelColor: "rgba(0, 0, 0, 0.78)",
      highlightColor: "#00E8F0",
      panelTextColor: "#ffffff",
      panelFooterBg: "#ffffff",
      panelFooterTextColor: "#000000",
      topAccentFrom: "#00f0ff",
      topAccentTo: "#00c8d4",
      introLabel: "FOOTBALL",
      outroLabel: "READ ON",
    },
    "Football365 — football news shorts.",
  ),
  genericBrand(
    "teamtalk",
    "TEAMtalk",
    "Football news shorts",
    "teamtalk.com",
    "For more updates, head to TEAMtalk.com",
    ["Football", "TEAMtalk", "News"],
    {
      /* TEAMtalk Shorts: dark charcoal panel, vivid mint/teal highlights, white type — distinct from F365 / PlanetF1. */
      fontSize: 66,
      lineHeight: 1.05,
      textBoxWidthPct: 86,
      overlayOpacity: 0.52,
      panelColor: "#222326",
      highlightColor: "#2AF5C0",
      panelTextColor: "#ffffff",
      panelFooterBg: "#0f1012",
      panelFooterTextColor: "#ffffff",
      topAccentFrom: "#2AF5C0",
      topAccentTo: "#18b898",
      headlineFont: "roboto-condensed",
      introLabel: "LATEST",
      outroLabel: "FOLLOW",
      animationEnabled: true,
    },
    "TEAMtalk — football news shorts.",
  ),
  genericBrand(
    "planetfootball",
    "Planet Football",
    "Football features / news shorts",
    "planetfootball.com",
    "For more stories, visit PlanetFootball.com",
    ["Football", "Features", "Analysis"],
    {
      /* PlanetFootball.com: black chrome like the site nav, white type, neon lime header stripe + keyword hits. */
      panelColor: "#000000",
      highlightColor: "#C8FF5C",
      panelTextColor: "#ffffff",
      panelFooterBg: "#000000",
      panelFooterTextColor: "#ffffff",
      topAccentFrom: "#D4FF5C",
      topAccentTo: "#9AE635",
      headlineFont: "bebas-neue",
      introLabel: "FEATURE",
      outroLabel: "MORE",
    },
    "Planet Football — football features and news shorts.",
  ),
  genericBrand(
    "planetrugby",
    "Planet Rugby",
    "Rugby union news shorts",
    "planetrugby.com",
    "For more rugby coverage, head to PlanetRugby.com",
    ["Rugby union", "Six Nations", "Club rugby"],
    {
      /* Reference: white condensed caps + mustard-gold highlights on cool dark panel (Planet Rugby quote cards). */
      panelColor: "#111827",
      highlightColor: "#C5A15A",
      panelTextColor: "#ffffff",
      panelFooterBg: "#0f172a",
      panelFooterTextColor: "#ffffff",
      topAccentFrom: "#d4b87a",
      topAccentTo: "#C5A15A",
      headlineFont: "bebas-neue",
      introLabel: "RUGBY",
      outroLabel: "COVERAGE",
    },
    "Planet Rugby — rugby union news shorts.",
  ),
  genericBrand(
    "loverugbyleague",
    "Love Rugby League",
    "Rugby league news shorts",
    "loverugbyleague.com",
    "For more rugby league news, visit LoveRugbyLeague.com",
    ["Rugby league", "Super League", "NRL"],
    {
      /* Reference: navy headline bar + white type, orange lower band + white source (Love Rugby League Shorts). */
      panelColor: "#222B38",
      highlightColor: "#E24D2D",
      panelTextColor: "#ffffff",
      panelFooterBg: "#E24D2D",
      panelFooterTextColor: "#ffffff",
      topAccentFrom: "#ff6b3d",
      topAccentTo: "#E24D2D",
      introLabel: "LEAGUE",
      outroLabel: "MORE",
    },
    "Love Rugby League — rugby league news shorts.",
  ),
  genericBrand(
    "tennis365",
    "Tennis365",
    "Tennis news shorts",
    "tennis365.com",
    "For more tennis news, head to Tennis365.com",
    ["Tennis", "ATP", "WTA"],
    {
      panelColor: "#422006",
      highlightColor: "#facc15",
      introLabel: "COURTSIDE",
      outroLabel: "SCOREBOARD",
    },
    "Tennis365 — tennis news shorts.",
  ),
  genericBrand(
    "cricket365",
    "Cricket365",
    "Cricket news shorts",
    "cricket365.com",
    "For more cricket coverage, head to Cricket365.com",
    ["Cricket", "Test match", "White ball"],
    {
      panelColor: "#064e3b",
      highlightColor: "#6ee7b7",
      introLabel: "SESSION",
      outroLabel: "STUMPS",
    },
    "Cricket365 — cricket news shorts.",
  ),
  genericBrand(
    "golf365",
    "Golf365",
    "Golf news shorts",
    "golf365.com",
    "For more golf news, head to Golf365.com",
    ["Golf", "DP World Tour", "Majors"],
    {
      panelColor: "#064e3b",
      highlightColor: "#a7f3d0",
      introLabel: "FAIRWAY",
      outroLabel: "CLUBHOUSE",
    },
    "Golf365 — golf news shorts.",
  ),
  genericBrand(
    "racing365",
    "Racing365",
    "Racing news shorts",
    "racing365.com",
    "For more racing coverage, visit Racing365.com",
    ["Racing", "Horse racing", "Cards"],
    {
      /* Racing365.com: dark navy chrome, white type, gold/amber highlights (logo + Next Off style). */
      panelColor: "#0c1526",
      highlightColor: "#f5b018",
      panelTextColor: "#ffffff",
      panelFooterBg: "#0a1220",
      panelFooterTextColor: "#ffffff",
      topAccentFrom: "#fcd34d",
      topAccentTo: "#c2410c",
      introLabel: "RACING",
      outroLabel: "NEXT RACE",
    },
    "Racing365 — racing news shorts (horse racing and cards).",
  ),
  genericBrand(
    "sport365",
    "Sport365",
    "General sport news shorts",
    "sport365.com",
    "For more sport, head to Sport365.com",
    ["Sport", "Breaking", "Analysis"],
    {
      /* Sport365: dark charcoal chrome, white type, lavender “365” accent (logo / nav). */
      panelColor: "#14171A",
      highlightColor: "#B886CD",
      panelTextColor: "#ffffff",
      panelFooterBg: "#0f1217",
      panelFooterTextColor: "#ffffff",
      topAccentFrom: "#d4b8e8",
      topAccentTo: "#7c5aa6",
      introLabel: "SPORT",
      outroLabel: "HEADLINES",
    },
    "Sport365 — general sport news shorts.",
  ),
  genericBrand(
    "grassrootgoals",
    "Grassroot Goals",
    "Grassroots football shorts",
    "grassrootgoals.com",
    "For more grassroots football, visit GrassrootGoals.com",
    ["Grassroots", "Community", "Local football"],
    {
      panelColor: "#431407",
      highlightColor: "#fb923c",
      introLabel: "GRASSROOTS",
      outroLabel: "PITCHSIDE",
    },
    "Grassroot Goals — grassroots football shorts.",
  ),
] as const;

export function getNewsShortBrandTemplateDefinition(
  id: string,
): NewsShortBrandTemplateDefinition | undefined {
  return NEWS_SHORTS_BRAND_TEMPLATES.find((b) => b.id === id);
}

export function mergeParsedTemplateWithBrandStyle(
  parsed: NewsShortTemplateData,
  brandId: string | undefined,
): NewsShortTemplateData {
  const def = brandId ? getNewsShortBrandTemplateDefinition(brandId) : undefined;
  const brandStyle = def?.buildTemplate().style;
  return {
    ...parsed,
    brandTemplateId: brandId || parsed.brandTemplateId,
    /** Parser always returns default style — re-apply the active brand palette after every parse. */
    style: { ...NEWS_SHORT_DEFAULT_STYLE, ...parsed.style, ...brandStyle },
  };
}

/**
 * Default → brand palette → caller overrides.
 * Used when restoring drafts (partial `style` must not fall back to PlanetF1-ish defaults alone)
 * and when normalising API payloads so video/render builds match the selected template brand.
 */
export function mergeNewsShortStyleForBrand(
  brandId: string | undefined,
  userStyle: Partial<NewsShortStyleControls> | undefined,
): NewsShortStyleControls {
  const def = brandId ? getNewsShortBrandTemplateDefinition(brandId) : undefined;
  const brandStyle = def?.buildTemplate().style;
  return { ...NEWS_SHORT_DEFAULT_STYLE, ...(brandStyle ?? {}), ...(userStyle ?? {}) };
}
