export type SocialVideoTone = "breaking" | "analysis" | "reaction" | "result";

export type SocialVideoSeoInput = {
  headline: string;
  article_url: string;
  article_text: string;
  main_topic: string;
  entities: string[];
  event: string;
  publish_date: string;
  tone: SocialVideoTone;
};

export type SocialVideoSeoTemplate = {
  file_name: string;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  thumbnail_text: string;
  youtube_title: string;
  youtube_description: string;
  youtube_tags: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with",
]);

function clampWords(input: string, maxWords: number): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function clean(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function yearFromDate(input: string): string {
  const m = String(input || "").match(/\b(19|20)\d{2}\b/);
  if (m) return m[0];
  return String(new Date().getUTCFullYear());
}

function slugBits(input: string): string[] {
  return clean(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w && !STOP_WORDS.has(w));
}

function unique(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const c = clean(v);
    if (!c) continue;
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function toHashtag(input: string): string {
  const compact = clean(input).replace(/[^a-zA-Z0-9 ]/g, "");
  if (!compact) return "";
  return `#${compact.replace(/\s+/g, "")}`;
}

function toneHooks(tone: SocialVideoTone): { short: string; long: string } {
  switch (tone) {
    case "breaking":
      return { short: "just happened", long: "confirmed update just happened" };
    case "reaction":
      return { short: "fans react", long: "fans react as shock spreads" };
    case "result":
      return { short: "final outcome", long: "final outcome and result explained" };
    default:
      return { short: "what it means", long: "full breakdown and what it means" };
  }
}

export function generateSocialVideoSeo(input: SocialVideoSeoInput): SocialVideoSeoTemplate {
  const headline = clean(input.headline || "Sports update");
  const topic = clean(input.main_topic || "sports");
  const event = clean(input.event || "latest event");
  const articleUrl = clean(input.article_url || "");
  const entities = unique(input.entities || []).slice(0, 4);
  const entityLead = entities[0] || "team";
  const eventYear = yearFromDate(input.publish_date);
  const hooks = toneHooks(input.tone);

  const fileParts = unique([
    ...slugBits(topic).slice(0, 3),
    ...slugBits(entityLead).slice(0, 2),
    ...slugBits(event).slice(0, 3),
    eventYear,
  ]);
  const file_name = `${fileParts.join("-") || "sports-short"}-short.mp4`;

  const baseTitle = clean(`${topic}: ${headline}`);
  const title = clampWords(baseTitle, 11).slice(0, 70);

  const description = [
    `${headline} — ${hooks.short}.`,
    `${topic} update on ${event}${entities[0] ? ` featuring ${entities[0]}` : ""}.`,
    entities[1] ? `${entities[1]} also in focus.` : "",
    articleUrl ? `Read more: ${articleUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const tags = unique([
    topic,
    `${topic} news`,
    event,
    headline,
    ...entities,
    "youtube shorts",
    "tiktok",
    "instagram reels",
    "sports news",
    "breaking sports",
  ]).slice(0, 15);

  const hashtags = unique([
    toHashtag(topic),
    toHashtag(event),
    ...entities.map(toHashtag),
    "#SportsNews",
    "#Shorts",
  ])
    .filter(Boolean)
    .slice(0, 6);

  const thumbnail_text = clampWords(
    clean(
      input.tone === "breaking"
        ? "JUST HAPPENED"
        : input.tone === "reaction"
          ? "FANS STUNNED"
          : input.tone === "result"
            ? "FINAL RESULT"
            : "WHAT IT MEANS",
    ),
    5,
  ).toUpperCase();

  const youtube_title = clean(`${headline} | ${topic} ${event} ${hooks.long}`).slice(0, 100);

  const youtube_description = [
    `${topic} update: ${headline}.`,
    `${event} ${hooks.long}${entities.length ? ` with ${entities.join(", ")}.` : "."}`,
    articleUrl ? `Read more: ${articleUrl}` : "",
    hashtags.join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  const youtube_tags = unique([
    ...tags,
    `${topic} analysis`,
    `${event} result`,
    ...entities.map((e) => `${e} news`),
  ]).slice(0, 20);

  return {
    file_name,
    title,
    description,
    tags,
    hashtags,
    thumbnail_text,
    youtube_title,
    youtube_description,
    youtube_tags,
  };
}

