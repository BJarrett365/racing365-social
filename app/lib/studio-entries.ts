/** Dashboard + header “Studios” menu — single source of truth. */

export type StudioAccent = "green" | "muted";

export type StudioNavGroup = "video" | "editorial" | "audio" | "utilities" | "roadmap";

export type StudioDashboardCard = {
  title: string;
  href: string;
  heading: string;
  description: string;
  cta: string;
  accent: StudioAccent;
  /** Shown on card + disables navigation when set */
  status?: string;
  navGroup: StudioNavGroup;
};

export const NAV_GROUP_LABEL: Record<StudioNavGroup, string> = {
  video: "Video & social",
  editorial: "Editorial & language",
  audio: "Audio",
  utilities: "Library & utilities",
  roadmap: "Roadmap",
};

export const NAV_GROUP_ORDER: StudioNavGroup[] = ["video", "editorial", "audio", "utilities", "roadmap"];

export const PRIMARY_STUDIO_CARDS: StudioDashboardCard[] = [
  {
    title: "Shorts Studio",
    href: "/templates",
    heading: "Portrait social video templates",
    description:
      "Build short-form clips from racing, football, F1 and sport-specific template bundles.",
    cta: "Open Shorts Studio",
    accent: "green",
    navGroup: "video",
  },
  {
    title: "Landscape Studio",
    href: "/landscape",
    heading: "Landscape video workflows",
    description: "Create wider-format editorial and social video outputs for desktop and platform publishing.",
    cta: "Open Landscape Studio",
    accent: "green",
    navGroup: "video",
  },
  {
    title: "Article Studio",
    href: "/article-studio",
    heading: "Import, rewrite, translate and review",
    description: "Bring article imports, YouTube transcripts, rewrites, translations and review into one hub.",
    cta: "Open Article Studio",
    accent: "green",
    navGroup: "editorial",
  },
  {
    title: "Data Studio",
    href: "/data-studio",
    heading: "Feeds and editorial learning by sport",
    description:
      "Football, rugby, cricket, tennis, F1 and more — structured data entry points plus a library of BBC references and Planet Sport brand styles.",
    cta: "Open Data Studio",
    accent: "green",
    navGroup: "editorial",
  },
  {
    title: "Language Studio",
    href: "/language-studio",
    heading: "Translation, localisation and export",
    description: "Run source imports, rewrites, translations, governance checks and XML/JSON exports.",
    cta: "Open Language Studio",
    accent: "green",
    navGroup: "editorial",
  },
  {
    title: "Podcast Studio",
    href: "/podcast-template",
    heading: "Podcast script builder",
    description: "Shape articles, notes and transcripts into podcast-ready scripts and formats.",
    cta: "Open Podcast Studio",
    accent: "green",
    navGroup: "audio",
  },
  {
    title: "Audio Studio",
    href: "/audio-studio",
    heading: "Notes, transcription, TTS and voice workflows",
    description: "Record, upload, transcribe, translate and create reusable voice assets with OpenAI and ElevenLabs.",
    cta: "Open Audio Studio",
    accent: "green",
    navGroup: "audio",
  },
  {
    title: "Tools",
    href: "/tools",
    heading: "Utility hub",
    description: "Access YouTube importing, URL-to-article workflows, export tools and creator utilities.",
    cta: "Open Tools",
    accent: "green",
    navGroup: "utilities",
  },
  {
    title: "Library",
    href: "/library",
    heading: "Assets and generated outputs",
    description: "Review saved images, videos, manifests, source media and reusable creative assets.",
    cta: "Open Library",
    accent: "green",
    navGroup: "utilities",
  },
  {
    title: "Schedule Studio",
    href: "/editing-studio",
    heading: "Editorial scheduling and social workflow",
    description: "Manage projects, copy, media, previews and export-ready schedule items.",
    cta: "Open Schedule Studio",
    accent: "green",
    navGroup: "roadmap",
  },
  {
    title: "Live Control",
    href: "/live",
    heading: "Mux and Restream sessions",
    description: "Create, monitor and manage live sessions with provider setup and ingest controls.",
    cta: "Coming soon",
    accent: "muted",
    status: "Coming soon",
    navGroup: "roadmap",
  },
];

export type NewsShortsCard = {
  title: string;
  href: string;
  heading: string;
  description: string;
  cta: string;
};

export const NEWS_SHORTS_CARDS: NewsShortsCard[] = [
  {
    title: "News Shorts (Planet Sport)",
    href: "/news-shorts",
    heading: "Video and social images from article content",
    description:
      "Create Planet Sport news-led short videos, quote cards, thumbnails and social images from article scripts and editorial assets.",
    cta: "Open News Shorts",
  },
];

export type SupportCard = {
  title: string;
  href: string;
  description: string;
};

export const SUPPORT_CARDS: SupportCard[] = [
  { title: "Product", href: "/product", description: "Overview, features and use cases." },
  { title: "How It Works", href: "/how-it-works", description: "Step-by-step workflow guide." },
  { title: "Guard Rails", href: "/guard-rails", description: "Editorial and safety boundaries." },
  {
    title: "Brand Guidelines",
    href: "/brand-guidelines",
    description: "Planet Sport Studio visual and tone guidance.",
  },
  { title: "Prompts", href: "/prompts", description: "Prompt library and AI instructions." },
  { title: "Admin", href: "/admin", description: "Settings, integrations and keys." },
];

/** Extra link folded into the Video & social column (not duplicated as a full dashboard card). */
export const STUDIOS_MENU_VIDEO_EXTRAS: { title: string; href: string }[] = [
  { title: "News Shorts", href: "/news-shorts" },
];

export function studiosGroupedForNavMenu(): { group: StudioNavGroup; label: string; items: StudioDashboardCard[] }[] {
  const byGroup = new Map<StudioNavGroup, StudioDashboardCard[]>();
  for (const g of NAV_GROUP_ORDER) byGroup.set(g, []);
  for (const card of PRIMARY_STUDIO_CARDS) {
    byGroup.get(card.navGroup)!.push(card);
  }
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    label: NAV_GROUP_LABEL[group],
    items: byGroup.get(group) ?? [],
  }));
}
