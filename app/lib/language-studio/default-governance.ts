import type {
  LanguageCode,
  LanguageComplianceNote,
  LanguageGuardrail,
  LanguageMarketRule,
  LanguageProtectedTerm,
  LanguageProviderMode,
  LanguageSportRule,
} from "@/app/lib/language-studio/types";

const now = "2026-01-01T00:00:00.000Z";

export const DEFAULT_GUARDRAILS: LanguageGuardrail[] = [
  ["fact-safety", "Do not invent facts", "Do not invent facts, quotes, outcomes, standings, dates, times, locations, teams or drivers.", "red"],
  ["fact-safety", "Preserve numbers and results", "Do not change numbers, race results, standings, dates, times or locations.", "red"],
  ["translation-safety", "Natural translation", "Translate naturally while preserving source meaning and proper nouns unless glossary says otherwise.", "amber"],
  ["translation-safety", "Quote accuracy", "Translate direct quotes accurately, but do not rewrite or improve them.", "red"],
  ["editorial-safety", "PlanetF1 tone", "Keep PlanetF1 tone: fast, sharp, expert and fan-first without unsupported opinion.", "amber"],
  ["editorial-safety", "No sensationalism", "Do not make content more sensational, softer or more extreme than the source.", "amber"],
  ["seo-safety", "SEO from source facts", "Create SEO title, meta description and slug only from source facts; do not keyword stuff.", "amber"],
  ["compliance-safety", "Compliance flags", "Flag betting, medical, legal, defamatory, likeness or AI disclosure risks.", "red"],
  ["rights-safety", "Media rights", "Do not assume image, video, voice or likeness rights; flag third-party media.", "red"],
].map(([category, title, rule, severity], index) => ({
  id: `seed-guardrail-${index + 1}`,
  category: category as LanguageGuardrail["category"],
  title,
  rule,
  severity: severity as LanguageGuardrail["severity"],
  active: true,
  createdAt: now,
  updatedAt: now,
}));

const protectedTerms = [
  "Formula 1",
  "F1",
  "FIA",
  "DRS",
  "Grand Prix",
  "Sprint",
  "Safety Car",
  "Virtual Safety Car",
  "pit lane",
  "pole position",
  "paddock",
  "constructors' championship",
  "drivers' championship",
  "Max Verstappen",
  "Lewis Hamilton",
  "Charles Leclerc",
  "Lando Norris",
  "George Russell",
  "Fernando Alonso",
  "Oscar Piastri",
  "Carlos Sainz",
  "Sergio Perez",
  "Red Bull",
  "Ferrari",
  "Mercedes",
  "McLaren",
  "Aston Martin",
  "Williams",
  "Alpine",
  "Haas",
  "Racing Bulls",
  "Sauber",
];

export const DEFAULT_PROTECTED_TERMS: LanguageProtectedTerm[] = protectedTerms.map((term, index) => ({
  id: `seed-protected-${index + 1}`,
  term,
  type: /Verstappen|Hamilton|Leclerc|Norris|Russell|Alonso|Piastri|Sainz|Perez/.test(term)
    ? "driver"
    : /Red Bull|Ferrari|Mercedes|McLaren|Aston Martin|Williams|Alpine|Haas|Racing Bulls|Sauber/.test(term)
      ? "team"
      : "technical term",
  doNotTranslate: true,
  approvedVariants: [term],
  notes: "PlanetF1 seed protected term.",
  createdAt: now,
  updatedAt: now,
}));

const languageDefaults: Array<[LanguageCode, string, "ltr" | "rtl", string, LanguageProviderMode]> = [
  ["es", "es-ES", "ltr", "Spain; allow Latin America market override.", "deepl-openai"],
  ["it", "it-IT", "ltr", "Italian F1 editorial tone; natural headlines.", "deepl-openai"],
  ["de", "de-DE", "ltr", "German compound nouns allowed; avoid tabloid phrasing.", "deepl-openai"],
  ["fr", "fr-FR", "ltr", "French motorsport style; preserve quotes accurately.", "deepl-openai"],
  ["nl", "nl-NL", "ltr", "Dutch direct style; keep F1 terms consistent.", "deepl-openai"],
  ["pt", "pt-PT", "ltr", "Portugal by default; allow Brazil market override.", "deepl-openai"],
  ["ar", "ar", "rtl", "RTL support required; store clean text only with language metadata.", "openai"],
  ["zh", "zh-Hans", "ltr", "Use Simplified Chinese by default.", "openai"],
  ["ja", "ja-JP", "ltr", "Japanese natural readability; preserve names and teams.", "openai"],
  ["da", "da-DK", "ltr", "Danish concise headline style.", "deepl-openai"],
  ["fi", "fi-FI", "ltr", "Finnish natural grammar; avoid over-literal phrasing.", "deepl-openai"],
  ["af", "af-ZA", "ltr", "Afrikaans clear editorial style.", "openai"],
  ["zu", "zu-ZA", "ltr", "Zulu clear journalistic style.", "openai"],
  ["xh", "xh-ZA", "ltr", "Xhosa clear journalistic style.", "openai"],
];

export const DEFAULT_MARKET_RULES: LanguageMarketRule[] = languageDefaults.map(([language, locale, direction, notes, fallbackProvider]) => ({
  id: `seed-market-${language}`,
  market: language === "es" ? "Spain" : language === "pt" ? "Portugal" : locale,
  language,
  locale,
  direction,
  seoKeywordRules: "Use source-supported keywords only. Do not keyword stuff.",
  toneRules: "Fast, sharp, expert, fan-first. Do not overhype.",
  spellingRules: notes,
  headlineStyleNotes: "Punchy but factual. Preserve quote meaning.",
  seoNotes: "Keep SEO title under 60 chars where practical and meta description under 160 chars.",
  dateFormat: "locale",
  timeFormat: "locale",
  currencyFormat: "locale",
  complianceNotes: notes,
  fallbackProvider,
  createdAt: now,
  updatedAt: now,
}));

export const DEFAULT_SPORT_RULES: LanguageSportRule[] = [
  {
    id: "seed-sport-f1",
    sport: "Formula 1",
    keyTerms: ["DRS", "Grand Prix", "Sprint", "Safety Car", "Virtual Safety Car", "pit lane", "pole position", "paddock"],
    dataRules: "Preserve results, standings, sessions, lap times, dates, teams, drivers and race names exactly unless source says otherwise.",
    protectedStats: ["race result", "qualifying result", "points", "standings", "lap time", "grid position"],
    namingConventions: "Use official driver/team names. Do not translate F1, FIA, DRS or Grand Prix unless market rule explicitly allows it.",
    examples: "Max Verstappen, Red Bull, constructors' championship, drivers' championship.",
    createdAt: now,
    updatedAt: now,
  },
];

export const DEFAULT_COMPLIANCE_NOTES: LanguageComplianceNote[] = [
  {
    id: "seed-compliance-global-risk",
    market: "Global",
    riskType: "editorial-risk",
    rule: "Flag betting references, medical claims, injury claims, legal claims, defamatory language, media rights and likeness concerns.",
    action: "Escalate red flags before approval.",
    escalationRequired: true,
    createdAt: now,
    updatedAt: now,
  },
];
