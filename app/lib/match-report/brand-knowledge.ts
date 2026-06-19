import type { LanguageKnowledgeFile } from "@/app/lib/language-studio/types";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import { MATCH_REPORT_PUBLISHING_EEAT_GUIDELINES } from "@/app/lib/match-report/match-report-publishing-guidelines";
import { PLANET_SPORT_BRANDS } from "@/app/lib/planet-sport-brands/catalog";
import { getBrandEditorialRulesById } from "@/features/editing-studio/brands/resolve-brand";

/** Knowledge Base file ids — seeded into Language Studio governance. */
export const TEAMTALK_BRAND_KNOWLEDGE_ID = "seed-knowledge-teamtalk-brand-style";
export const FOOTBALL365_BRAND_KNOWLEDGE_ID = "seed-knowledge-football365-brand-style";
export const PLANET_FOOTBALL_BRAND_KNOWLEDGE_ID = "seed-knowledge-planet-football-brand-style";
export const MATCH_REPORT_PUBLISHING_KNOWLEDGE_ID = "seed-knowledge-match-report-publishing";

/** Short labels shown in Match Report Builder Brand style field. */
export const TEAMTALK_BRAND_STYLE_SUMMARY =
  "Transfer authority — trusted sources, explain don't repeat, conversational not corporate";

export const FOOTBALL365_BRAND_STYLE_SUMMARY =
  "Opinionated & witty — stats-led talking points, daft and deadly serious";

export const PLANET_FOOTBALL_BRAND_STYLE_SUMMARY =
  "Fun & positive — skills, nostalgia, shareable — laughing with fans, not at them";

export const BRAND_STYLE_SUMMARY_BY_TARGET: Partial<Record<MatchReportTargetBrand, string>> = {
  football365: FOOTBALL365_BRAND_STYLE_SUMMARY,
  teamtalk: TEAMTALK_BRAND_STYLE_SUMMARY,
  "planet-football": PLANET_FOOTBALL_BRAND_STYLE_SUMMARY,
};

/** System-style tone blocks injected into Match Report EIO / AI prompts. */
export const TEAMTALK_AI_TONE_INSTRUCTION = `TEAMtalk is football's transfer authority. Write with confidence, experience and credibility built from decades of transfer coverage. Content should feel knowledgeable and engaging while remaining clear and easy to read.

Use a conversational football tone, not a corporate one. Keep sentences short, direct and energetic. Add context and insight rather than simply repeating rumours. Explain what stories mean, how players fit, what impact moves may have and whether developments make sense.

Be confident but never arrogant. Be opinionated when appropriate, but always support opinions with logic or evidence. Separate facts, sourced reporting and speculation clearly.

Avoid clickbait, fake certainty, excessive hype and overdramatic language. Never present rumours as confirmed facts.

The goal is simple: readers should trust TEAMtalk and leave every article feeling informed, believing they learned something useful.`;

export const FOOTBALL365_AI_TONE_INSTRUCTION = `Football365 (F365) writes with a forthright attitude forged over 25 years on Planet Sport. Football is everything and nothing — ludicrous yet utterly serious, big business and a massive fuss about nothing. Analyse tactics, storylines and stats in detail while acknowledging the sport is almost entirely inconsequential. Flip between laughing at overreactions and being deadly serious about the subjects that matter.

Be opinionated: strident takes, considered analysis, innovative angles and no little daftness. We are enormous football fans but definitely not cheerleaders. Talking points are our thing — if something is funny, iffy, sanctimonious or downright weird, call it out. Use meaningful statistics where they illuminate the match; F365 aims to be the No.1 resource for simple but meaningful football stats.

Write with originality whether the piece is 400 words or 2000. A Football365 story should read like Football365. Engage mature fans with humour plus tactical and narrative depth beyond single-club myopia. Appeal to stats-curious younger readers with clear, bite-sized insight that can convert them into loyal readers.

Do not sacrifice morals for clicks. Avoid false promises, cheap lure headlines and corporate tone. Tread the line between cleverly appealing to readers and misleading them.`;

export const PLANET_FOOTBALL_AI_TONE_INSTRUCTION = `Planet Football is a celebration of everything that's great about football. Write with warmth, humour and positivity — leave negativity to others and focus on what fans enjoy reading and sharing.

Cover football like no other brand: celebrate skills (nutmegs, trivelas, no-look passes), memorable moments, nostalgia and light-hearted joy alongside match facts. Be funny, but fans should feel you're laughing with them, not at them. Use in-jokes and self-deprecating humour; never aim to annoy or belittle readers.

Tone is friendly and informal — like the conversation football fans have with friends in the pub or on WhatsApp. Don't take yourselves too seriously. Content should feel shareable on social, especially for a youth audience, while quizzes and nostalgia can still land with older fans.

Even in match reports, lead with enjoyment and standout moments where the facts allow. Stay accurate on scorelines, events and quotes, but frame the narrative positively and entertainingly. Avoid preachy negativity, toxic punditry and corporate stiffness.

The goal: readers finish feeling uplifted, entertained and keen to share — Planet Football is fun football content done well.`;

export const FOOTBALL365_VIDEO_AI_INSTRUCTION = `Football365 (F365) video and Shorts: opinionated broadcast energy with punchy hooks — football is daft and deadly serious at once. Lead with the talking point or stat that matters; use on-screen text sparingly and never as clickbait. Stats overlays and widgets should feel meaningful, not decorative.

Visual tone: confident editorial sports coverage, not corporate brand film. Allow humour and scepticism where facts support it. Avoid fake certainty, SHOCK headlines, or sensationalist lower-thirds.

Vertical Shorts: tight pacing, strong opening frame, clear takeaway in the first 2 seconds. Leave headline-safe negative space when templates require overlays. Reference the official F365 brand manual for colours, typography and logo placement.`;

export const FOOTBALL365_SOCIAL_AI_INSTRUCTION = `Football365 social copy: strident, witty talking points — not cheerleading. X/Threads: sharp hooks, stats-led lines, debate-friendly without toxicity. Instagram: conversational caption + context; stats or table hooks when relevant. Facebook: slightly longer setup, still punchy.

Use meaningful numbers when the source supports them. Never sacrifice accuracy for engagement. Avoid corporate tone, fake certainty and empty hype. Sign-offs and CTAs should feel like F365 — direct, fan-aware, occasionally irreverent.`;

export const TEAMTALK_VIDEO_AI_INSTRUCTION = `TEAMtalk video and Shorts: transfer authority on screen — fast, credible, energetic. Open with the news hook or exclusive angle; distinguish reporting from speculation in voiceover and on-screen text.

TikTok / vertical: reactive fan-debate energy, strong hook in the first second, no fake "DONE DEAL" graphics unless confirmed. YouTube: allow slightly more context and analysis; still keep pace up.

Visual tone: modern football media, stadium or newsroom energy — no unreadable kit crests or sponsor text in generated frames. Follow TEAMtalk brand manual for colour, type and logo safe zones.`;

export const TEAMTALK_SOCIAL_AI_INSTRUCTION = `TEAMtalk social: transfer news first — speed with credibility. X: breaking lines, quick updates, source-aware wording (understands / has learned / sources indicate). TikTok: fast reactive hooks, fan debate, no fake certainty.

Credit original sources where applicable. Separate fact, reporting and speculation clearly even in short copy. Avoid clickbait caps, guaranteed language and corporate stiffness. CTAs should drive back to TEAMtalk as the transfer destination.`;

export const PLANET_FOOTBALL_VIDEO_AI_INSTRUCTION = `Planet Football video and Shorts: celebrate what's great about football — fun, positive, highly shareable. Highlight skills, nutmegs, trivelas, nostalgia and joyful moments; vertical-first pacing for youth audiences.

Visual tone: bright, informal, pub-chat energy — laughing with fans, never at them. Avoid preachy negativity, toxic punditry and dull corporate sports packaging. Leave space for playful on-screen copy when templates allow.

Follow Planet Football brand manual for colours, logo usage and typography. Nostalgia and quiz-style frames should feel warm and invite sharing.`;

export const PLANET_FOOTBALL_SOCIAL_AI_INSTRUCTION = `Planet Football social: positive, funny, shareable — WhatsApp/pub-chat tone. Instagram / TikTok: skill moments, nostalgia hooks, quiz teases, light lists; emoji sparingly and naturally. X: upbeat takes, celebrate standout moments, avoid pile-ons.

Never post negativity for engagement. In-jokes and self-deprecating humour are welcome; don't belittle players or fans. Youth-first framing: short, energetic, invite shares and comments.`;

export const AI_TONE_BY_TARGET: Partial<Record<MatchReportTargetBrand, string>> = {
  football365: FOOTBALL365_AI_TONE_INSTRUCTION,
  teamtalk: TEAMTALK_AI_TONE_INSTRUCTION,
  "planet-football": PLANET_FOOTBALL_AI_TONE_INSTRUCTION,
};

export function matchReportBrandStylePacketForTarget(target: MatchReportTargetBrand): string {
  if (target === "football365") {
    return [
      "FOOTBALL365 MATCH REPORT STYLE PACKET",
      "Brand identity: Football365 is opinionated, witty, stats-curious and allergic to bland wire copy. It treats football as both ludicrous and deadly serious.",
      "Audience: mature football fans with humour, tactical curiosity and interest beyond their own club; younger stats-curious readers should also learn something useful.",
      "Report promise: do not merely recap events. Explain why the result happened, which talking points matter, what was funny/iffy/weird, and what the data actually proves.",
      "Voice: forthright, sharp, conversational, occasionally daft, never cheerleading. Opinions are welcome when supported by match data, Loop Feed research or trusted sources.",
      "Structure: result-first intro; then match flow, turning point, chance-quality/tactical explanation, key individuals, table/competition implications and what next.",
      "Stats use: meaningful numbers only. xG, possession, shots, big chances, player ratings and table context should illuminate an argument, not sit as decoration.",
      "Humour boundary: wit is allowed; do not invent scandal, fake beef, quotes or motives. Laugh at the absurdity where the facts allow.",
      "Avoid: bland AI sports copy, neutral agency tone, false certainty, clickbait, cheap outrage, unearned superlatives and unsupported tactical claims.",
    ].join("\n");
  }
  if (target === "teamtalk") {
    return [
      "TEAMtalk MATCH REPORT STYLE PACKET",
      "Brand identity: TEAMtalk is authoritative, conversational and clear. It explains football news through squad impact, player futures and credible context.",
      "Audience: fans who want useful football intelligence without corporate stiffness or fake certainty.",
      "Report promise: explain the result, key player performances, tactical impact and what it means for the squad/manager/season.",
      "Voice: direct, confident and knowledgeable. Be opinionated when useful, but always explain why.",
      "Structure: result-first intro; key moments; player/squad implications; manager/reaction context; what next.",
      "Avoid: overdramatic claims, transfer-style certainty without sourcing, and repeating data without explaining impact.",
    ].join("\n");
  }
  if (target === "planet-football") {
    return [
      "PLANET FOOTBALL MATCH REPORT STYLE PACKET",
      "Brand identity: Planet Football is warm, funny, nostalgic and positive. It celebrates football's enjoyable moments.",
      "Voice: pub-chat friendly, shareable, playful and fan-aware. Laugh with fans, not at them.",
      "Report promise: factual match report with emphasis on standout moments, skills, emotion and shareable hooks.",
      "Avoid: toxic negativity, corporate tone and humour that belittles players or supporters.",
    ].join("\n");
  }
  return [
    "SPORT365 MATCH REPORT STYLE PACKET",
    "Brand identity: stats-focused, clear and analytical.",
    "Report promise: explain the match through data, xG, player ratings, tables and trend context.",
    "Voice: concise, evidence-led and useful.",
    "Reference: Sport365 colour / UI theme tokens in /brand-manuals/sport365-themes.json (extracted from Sport365.app).",
  ].join("\n");
}

export const TEAMTALK_BRAND_STYLE_GUIDE_FULL = `# TEAMtalk Brand Style Guide

## Brand Purpose

TEAMtalk exists to become the most trusted destination for football transfer news and intelligence.

We do not simply report transfer rumours. We verify, explain and add value.

Readers should come to TEAMtalk because they know they will receive: faster updates, better context, trusted sources, exclusive information, expert opinion — everything in one place.

If a story breaks elsewhere, readers should instinctively think: "Let's see what TEAMtalk says."

## Vision

TEAMtalk will become the number one resource for transfer news in football. Recognised for exclusive transfer information, trusted journalists and correspondents, strong contacts throughout football, club-specific expertise, modern content formats and multi-platform delivery.

Readers should never need five tabs open. TEAMtalk becomes the single destination.

## Brand Positioning — The Transfer Authority

For nearly three decades TEAMtalk has covered football transfers and football news. We combine journalism, sources, data, analysis, opinion and modern content.

We are experienced without feeling old. Authoritative without feeling corporate. Confident without feeling arrogant.

## Audience

Primary: football fans aged roughly 16–55.

- Transfer obsessives — speed, reliability, rumours, insider information.
- Club loyalists — club-specific content, live blogs, potential signings, tactical fit, squad impact.
- Casual followers — clear language, quick summaries, context.

## Content Pillars

1. Transfer Gossip — biggest rumours quickly; credit sources; distinguish speculation from reporting; never exaggerate certainty.
2. Exclusives — own stories; accuracy over speed; verify where possible; protect credibility.
3. Club Transfer Hubs — live blogs, linked targets, transfer trackers, squad updates.
4. Analysis and Opinion — answer reader questions: fit, fee, formation, who loses out.
5. Modern Football Content — TikTok, Shorts, infographics, polls, fan reactions, data visualisation.

## Tone Of Voice

We are: knowledgeable, engaging, conversational, direct, opinionated when appropriate (always explain why).

We are NOT: clickbait, arrogant, overdramatic, fake certainty, corporate, sensationalist.

## Writing Style Rules

Headlines — good: "Man Utd identify £40m striker as new talks begin". Avoid: "SHOCK MOVE ROCKS PREMIER LEAGUE".

Opening paragraph — answer who, what, why, why now within 2–3 sentences.

Article structure: main news → source information → context → analysis → wider impact → related content.

Transfer language — use: understands, has learned, sources indicate, interest remains, monitoring. Avoid: done deal (unless complete), confirmed (unless confirmed), guaranteed, certain.

Source standards — clearly separate fact, reporting and speculation.

## Editorial Mission

We are not simply chasing clicks. We are building trust. The reader should leave every article thinking: "I've learned something useful here."`;

export const FOOTBALL365_BRAND_STYLE_GUIDE_FULL = `# Football365 (F365) Brand Style Guide

## Vision Statement

Football365 already has a well-established position in the market, with a loyal audience of readers who have been visiting the website daily for several years.

To attract the next generation of loyal users, we want to establish Football365 as the No.1 resource to view simple but meaningful football statistics. If someone wants to see a table for home form or second-half form only, their first thought should be to visit F365.

Our writers will use widgets in articles to bring data to life, while logged-in users will be able to create their own data visualisations in the F365 Stats Centre, sharing them across social media and in their own articles.

We will extend our own social media presence too, properly representing our unique tone of voice and points of difference, establishing Football365 as a brand that every football fan knows.

## The Tone of Voice

Football is everything and nothing. It is inherently ludicrous and yet utterly serious. It is a complex web of intertwining narratives, tactics and knowledge, and yet it is merely a pantomime. It is big business but also a massive fuss about nothing.

Football365 believes all this can be true. We analyse both the game and the storylines in extraordinary detail while always acknowledging that it is almost entirely inconsequential. We can flip between laughing at the overreactions and over-sensitivity around the sport and being deadly serious about the subjects that matter.

We want people to read Football365 but we don't want to sacrifice our morals in pursuit of clicks, hopefully knowing how to tread the line between cleverly appealing to readers and luring them in with false promises.

## The Pillars

Our original content should always take centre stage — that means strident opinions, considered analysis, innovative feature ideas and no little daftness — but there should be an element of originality in how we write all our content. A Football365 story should read like a Football365 story whether it is a 400-word news article about a proposed transfer or a 2000-word 16 Conclusions.

Football365 has had nearly 25 years to forge this identity as a website with an attitude. That identity should permeate our content, whether it be on the website, on social media or beyond.

Of all the things we know about football — and we really should know a lot — possibly the most important is that it really is both everything and nothing. It is daft and it is deadly serious.

## The Target Market

The existing audience, which we want to continue to grow and engage, is mature football fans with a sense of humour and an interest in tactics and narratives beyond their own club. They want to read about the big clubs and their storylines as well as the smaller teams and stories that we can surface.

The new target audience is younger, more interested in stats, perhaps wanting to write/produce their own content and using F365 as a resource for facts as well as opinions. They consume football content in more bite-sized pieces, but we can also turn them on to our unique way of covering the sport. The consumers might be converted into readers if we do this right.

## About Football365

Established in 1997, Football365 is part of the Planet Sport network along with sister sport sites including PlanetF1, LoveRugbyLeague, TEAMtalk, PlanetRugby, Cricket365, Golf365, Tennis365, Boxing365, Planet Football and Racing365.

## What We Do

Football365 has been covering football with a forthright attitude for more than 20 years. We're enormous football fans but we are definitely not cheerleaders. Talking points are our thing.

If there's something funny, iffy, sanctimonious or downright weird going on in football then we're onto it. It's what our readers expect. Each of us care too much about the game to let it carry on without sticking in our oar where it's due.

Readers have their say by adding comments and opinions to each article, writing letters for the Mailbox, and chatting in the Football365 Forum.

Regular features include Mediawatch, 16 Conclusions, Gossip and Premier League Winners and Losers. Our football live score centre provides live match stats, commentaries, fixtures and football league tables.

## Where We Publish

Football365 on the web, Facebook, Instagram, Twitter, Apple News, and YouTube.

## Key Contacts

Editor Sarah Winterburn runs the site with deputy editor Matt Stead and full-time journalists Ian Watson, Joe Williams, Dave Tickner and Will Ford. Editorial enquiries: theeditor@football365.com. Other enquiries: info@planetsport.com.

## About Planet Sport Publishing

Planet Sport is an independent publishing network, based in Leeds, UK, and home to an array of much-loved sports titles. Talented teams focused on quality journalism use their experience and insight to provide inspiring, entertaining and quality sports coverage to millions of sports lovers.`;

export const PLANET_FOOTBALL_BRAND_STYLE_GUIDE_FULL = `# Planet Football Brand Style Guide

## Vision Statement

We want Planet Football to be a multi-channel behemoth that every football fan knows. We are not aiming to generate tens of millions of page views a month, but we do want to be well recognised and respected for quality, enjoyable content around our key pillars. When brands want to reach a youth audience, they should want to work with us.

## The Pillars

Planet Football covers football like no other brand. While others write match reports, manager quotes and opinion pieces, we write about nutmegs, trivelas and no-look passes. Our other key pillars are quizzes, nostalgia and light-hearted lists, all of which make Planet Football stand out from the competition. They are what we will be known for and why brands will want to work with us.

## The Tone of Voice

Planet Football is a celebration of everything that's great about football. We leave negativity to the rest and focus on the positives as we believe it's this type of content that people like to read and share.

We are funny, but fans should think we're laughing with them, not at them. We're all about in-jokes and self-deprecating humour, and don't ever want anyone to get annoyed reading one of our articles.

Our tone of voice is friendly and informal. Planet Football is an extension of the conversation football fans have with their friends in the pub, coffee shop or on their WhatsApp chats — we're just a bit of fun and don't take ourselves too seriously.

## The Target Market

We target young and old with our quizzes and nostalgia, but our real focus is on attracting a youth audience with fun, positive content they can share and engage with on social media.

## About Planet Football

Established in 2017, Planet Football is part of the Planet Sport network along with sister sport sites including PlanetRugby, LoveRugbyLeague, TEAMtalk, Football365, Cricket365, Golf365, Tennis365, Boxing365, Planet F1 and Racing365. Entertainment sites ContactMusic and FemaleFirst are also part of an expanding site portfolio.

## What We Do

Planet Football is a celebration of everything that's great about football.

We publish feature articles every day including in-depth interviews, football nostalgia — including football in the 1990s and football in the Noughties — and regular football quizzes.

Our regular podcast, The Broken Metatarsal, picks up the nostalgia theme with interviews and discussions reminiscing about football in the 1990s and 2000s.

## Where We Publish

Planet Football on the web, Facebook, Twitter, YouTube, Instagram, and Apple News on iPhone, Mac or iPad.

## Key Contacts

Editor Mark Holmes and deputy editor Rob Conlon can be contacted at contact@planetfootball.com. All other enquiries: info@planetsport.com.

## About Planet Sport Publishing

Planet Sport is an independent publishing network, based in Leeds, UK, and home to an array of much-loved sports titles. Talented teams focused on quality journalism use their experience and insight to provide inspiring, entertaining and quality sports coverage to millions of sports lovers. Planet Sport's team is supported by YorMedia Solutions who create winning commercial and technical solutions for publishers like us.`;

function buildBrandKnowledgeFileContent(
  brandLabel: string,
  aiTone: string,
  summary: string,
  fullGuide: string,
  videoInstruction: string,
  socialInstruction: string,
  pdfUrl: string,
): string {
  return [
    `=== AI TONE INSTRUCTION (use for all ${brandLabel} editorial generation) ===`,
    aiTone,
    "",
    `=== AI VIDEO INSTRUCTION (Shorts, voiceover, Runway, video templates) ===`,
    videoInstruction,
    "",
    `=== AI SOCIAL INSTRUCTION (X, Instagram, TikTok, Facebook, YouTube community) ===`,
    socialInstruction,
    "",
    "=== BRAND STYLE SUMMARY ===",
    summary,
    "",
    "=== OFFICIAL BRAND MANUAL (PDF) ===",
    pdfUrl,
    "",
    "=== FULL BRAND STYLE GUIDE (reference) ===",
    fullGuide,
  ].join("\n");
}

export function createTeamtalkBrandKnowledgeFile(now = "2026-05-23T00:00:00.000Z"): LanguageKnowledgeFile {
  return {
    id: TEAMTALK_BRAND_KNOWLEDGE_ID,
    title: "TEAMtalk Brand Style Guide",
    kind: "tone-rules",
    language: "en",
    content: buildBrandKnowledgeFileContent(
      "TEAMtalk",
      TEAMTALK_AI_TONE_INSTRUCTION,
      TEAMTALK_BRAND_STYLE_SUMMARY,
      TEAMTALK_BRAND_STYLE_GUIDE_FULL,
      TEAMTALK_VIDEO_AI_INSTRUCTION,
      TEAMTALK_SOCIAL_AI_INSTRUCTION,
      "/brand-manuals/teamtalk-brand-manual.pdf",
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function createFootball365BrandKnowledgeFile(now = "2026-05-23T00:00:00.000Z"): LanguageKnowledgeFile {
  return {
    id: FOOTBALL365_BRAND_KNOWLEDGE_ID,
    title: "Football365 (F365) Brand Style Guide",
    kind: "tone-rules",
    language: "en",
    content: buildBrandKnowledgeFileContent(
      "Football365",
      FOOTBALL365_AI_TONE_INSTRUCTION,
      FOOTBALL365_BRAND_STYLE_SUMMARY,
      FOOTBALL365_BRAND_STYLE_GUIDE_FULL,
      FOOTBALL365_VIDEO_AI_INSTRUCTION,
      FOOTBALL365_SOCIAL_AI_INSTRUCTION,
      "/brand-manuals/football365-brand-manual.pdf",
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function createPlanetFootballBrandKnowledgeFile(now = "2026-05-23T00:00:00.000Z"): LanguageKnowledgeFile {
  return {
    id: PLANET_FOOTBALL_BRAND_KNOWLEDGE_ID,
    title: "Planet Football Brand Style Guide",
    kind: "tone-rules",
    language: "en",
    content: buildBrandKnowledgeFileContent(
      "Planet Football",
      PLANET_FOOTBALL_AI_TONE_INSTRUCTION,
      PLANET_FOOTBALL_BRAND_STYLE_SUMMARY,
      PLANET_FOOTBALL_BRAND_STYLE_GUIDE_FULL,
      PLANET_FOOTBALL_VIDEO_AI_INSTRUCTION,
      PLANET_FOOTBALL_SOCIAL_AI_INSTRUCTION,
      "/brand-manuals/planet-football-brand-manual.pdf",
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function createMatchReportPublishingKnowledgeFile(now = "2026-05-23T00:00:00.000Z"): LanguageKnowledgeFile {
  return {
    id: MATCH_REPORT_PUBLISHING_KNOWLEDGE_ID,
    title: "Match report publishing — length, structure & E-E-A-T",
    kind: "prompt",
    language: "en",
    content: [
      "=== WORD COUNT GUIDE (Planet Sport football publishing) ===",
      "Breaking news: 300–600 words",
      "Transfer news: 500–900 words",
      "Match reports: 600–1,200 words",
      "Opinion pieces: 800–1,500 words",
      "Evergreen guides / player profiles / deep dives: 1,500–3,000+ words",
      "Pillar content / everything-you-need-to-know pages: 2,000–5,000+ words",
      "",
      "=== E-E-A-T PRIORITIES ===",
      "Original information and synthesis from supplied sources",
      "Exclusive or imported quotes — preserve attribution",
      "Journalist opinion when editorial brief allows — must be grounded in facts",
      "Data, stats and linked sources from the feed",
      "First-hand match context from commentary and events",
      "Topic coverage: answer the main question quickly, then follow-ups",
      "No fluff — every paragraph earns its place",
      "",
      "=== TRUST & STRUCTURE ===",
      "Named author voice from editorial brief",
      "H1 title; H2/H3 sections; short paragraphs",
      "Images/video/social embeds when supplied in LOOP_FEED",
      "Internal links only when provided — never invent URLs",
      "",
      "=== AI MATCH REPORT INSTRUCTION ===",
      MATCH_REPORT_PUBLISHING_EEAT_GUIDELINES,
    ].join("\n"),
    createdAt: now,
    updatedAt: now,
  };
}

export function createStarterBrandKnowledgeFile(input: {
  id: string;
  title: string;
  brandLabel: string;
  preferredTone: string;
  hashtagBank?: string[];
  outroDefaults?: string[];
  primarySport?: string;
  now?: string;
}): LanguageKnowledgeFile {
  const now = input.now ?? "2026-05-23T00:00:00.000Z";
  const summary = input.preferredTone;
  const hashtags = (input.hashtagBank ?? []).join(" ");
  const aiTone = `${input.brandLabel} is part of the Planet Sport network. ${input.preferredTone}${input.primarySport ? ` Primary sport: ${input.primarySport}.` : ""}`;
  const videoInstruction = `${input.brandLabel} video and Shorts: lead with the news hook; keep on-screen text factual and readable. Match the brand's ${input.primarySport ?? "sport"} editorial tone. Hashtags when relevant: ${hashtags || "brand defaults"}.`;
  const socialInstruction = `${input.brandLabel} social copy: ${input.preferredTone} CTAs and sign-offs should point to ${input.outroDefaults?.[0] ?? "the brand site"}.`;
  const fullGuide = `# ${input.title}\n\nPlanet Sport network brand — starter knowledge file. Expand with official brand manual content when available.\n\n${summary}`;
  return {
    id: input.id,
    title: input.title,
    kind: "tone-rules",
    language: "en",
    content: buildBrandKnowledgeFileContent(
      input.brandLabel,
      aiTone,
      summary,
      fullGuide,
      videoInstruction,
      socialInstruction,
      `/brand-manuals/${input.id.replace("seed-knowledge-", "").replace(/-brand-style$/, "")}-brand-manual.pdf`,
    ),
    createdAt: now,
    updatedAt: now,
  };
}

function createCatalogBrandKnowledgeFiles(now: string): LanguageKnowledgeFile[] {
  const seededFull = new Set([
    FOOTBALL365_BRAND_KNOWLEDGE_ID,
    TEAMTALK_BRAND_KNOWLEDGE_ID,
    PLANET_FOOTBALL_BRAND_KNOWLEDGE_ID,
  ]);
  return PLANET_SPORT_BRANDS.filter((b) => b.knowledgeFileId && !seededFull.has(b.knowledgeFileId)).map((brand) => {
    const rules = brand.editorialRulesId
      ? getBrandEditorialRulesById(brand.editorialRulesId as Parameters<typeof getBrandEditorialRulesById>[0])
      : undefined;
    return createStarterBrandKnowledgeFile({
      id: brand.knowledgeFileId!,
      title: `${brand.displayName} Brand Style Guide`,
      brandLabel: brand.displayName,
      preferredTone: rules?.preferredTone ?? `${brand.displayName} editorial voice for ${brand.primarySport}.`,
      hashtagBank: rules?.hashtagBank ? [...rules.hashtagBank] : undefined,
      outroDefaults: rules?.outroDefaults ? [...rules.outroDefaults] : undefined,
      primarySport: brand.primarySport,
      now,
    });
  });
}

export function createDefaultBrandKnowledgeFiles(now = "2026-05-23T00:00:00.000Z"): LanguageKnowledgeFile[] {
  return [
    createFootball365BrandKnowledgeFile(now),
    createTeamtalkBrandKnowledgeFile(now),
    createPlanetFootballBrandKnowledgeFile(now),
    ...createCatalogBrandKnowledgeFiles(now),
    createMatchReportPublishingKnowledgeFile(now),
  ];
}

/** True when a seeded brand knowledge file predates video/social AI sections. */
export function brandKnowledgeFileNeedsRefresh(file: LanguageKnowledgeFile | undefined): boolean {
  if (!file?.content) return true;
  return !file.content.includes("=== AI VIDEO INSTRUCTION");
}

/** Knowledge file ids linked to each Match Report target brand. */
export const BRAND_KNOWLEDGE_FILE_IDS: Partial<Record<MatchReportTargetBrand, string[]>> = {
  football365: [FOOTBALL365_BRAND_KNOWLEDGE_ID, MATCH_REPORT_PUBLISHING_KNOWLEDGE_ID],
  teamtalk: [TEAMTALK_BRAND_KNOWLEDGE_ID, MATCH_REPORT_PUBLISHING_KNOWLEDGE_ID],
  "planet-football": [PLANET_FOOTBALL_BRAND_KNOWLEDGE_ID, MATCH_REPORT_PUBLISHING_KNOWLEDGE_ID],
};

export function brandStyleSummaryForTarget(targetBrand: MatchReportTargetBrand): string {
  return BRAND_STYLE_SUMMARY_BY_TARGET[targetBrand] ?? "";
}

export function aiToneForTargetBrand(targetBrand: MatchReportTargetBrand): string | undefined {
  return AI_TONE_BY_TARGET[targetBrand];
}

export function targetBrandHasKnowledgeGuide(targetBrand: MatchReportTargetBrand): boolean {
  return Boolean(BRAND_KNOWLEDGE_FILE_IDS[targetBrand]?.length);
}

export function pickBrandKnowledgeFiles(
  allFiles: Record<string, LanguageKnowledgeFile>,
  targetBrand: MatchReportTargetBrand,
): LanguageKnowledgeFile[] {
  const ids = BRAND_KNOWLEDGE_FILE_IDS[targetBrand] ?? [];
  return ids.map((id) => allFiles[id]).filter(Boolean);
}

export function aiToneFromKnowledgeFile(file: LanguageKnowledgeFile | undefined): string | undefined {
  return extractKnowledgeSection(file, "AI TONE INSTRUCTION");
}

export function aiVideoFromKnowledgeFile(file: LanguageKnowledgeFile | undefined): string | undefined {
  return extractKnowledgeSection(file, "AI VIDEO INSTRUCTION");
}

export function aiSocialFromKnowledgeFile(file: LanguageKnowledgeFile | undefined): string | undefined {
  return extractKnowledgeSection(file, "AI SOCIAL INSTRUCTION");
}

function extractKnowledgeSection(file: LanguageKnowledgeFile | undefined, section: string): string | undefined {
  if (!file?.content) return undefined;
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = file.content.match(new RegExp(`=== ${escaped}[^=]*===\\s*([\\s\\S]*?)(?:\\n\\s*===|$)`));
  return match?.[1]?.trim() || undefined;
}
