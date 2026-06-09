/** Dashboard + header “Studios” menu — single source of truth. */

export type StudioAccent = "green" | "muted";

export type StudioNavGroup = "video" | "editorial" | "audio" | "configure" | "utilities" | "roadmap";

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
  configure: "Configure",
  utilities: "Library & utilities",
  roadmap: "Roadmap",
};

export const NAV_GROUP_ORDER: StudioNavGroup[] = ["video", "editorial", "audio", "configure", "utilities", "roadmap"];

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
    title: "Match Report Builder",
    href: "/match-report-builder",
    heading: "Editorial-first football match reports",
    description:
      "Define brand voice and creator guidelines, import SixLogics core data, and build governed event intelligence before AI generation.",
    cta: "Open Match Report Builder",
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
    title: "News Shorts (Planet Sport)",
    href: "/news-shorts",
    heading: "Video and social images from article content",
    description:
      "Create Planet Sport news-led short videos, quote cards, thumbnails and social images from article scripts and editorial assets.",
    cta: "Open News Shorts",
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
    title: "Knowledge Base",
    href: "/knowledge-base",
    heading: "AI learning sources and editorial memory",
    description:
      "Organise URLs, files, creator styles, source brands, sport rules and prompt guidance that shape future AI output.",
    cta: "Open Knowledge Base",
    accent: "green",
    navGroup: "configure",
  },
  {
    title: "Tools",
    href: "/tools",
    heading: "Utility hub",
    description: "Access YouTube importing, URL-to-article workflows, export tools and creator utilities.",
    cta: "Open Tools",
    accent: "green",
    navGroup: "configure",
  },
  {
    title: "Integrations",
    href: "/admin/provider-keys-and-platform-services",
    heading: "Provider keys and connected services",
    description:
      "Manage OpenAI, ElevenLabs, Runway, Supabase, live video, translation and platform service settings.",
    cta: "Open Integrations",
    accent: "green",
    navGroup: "configure",
  },
  {
    title: "Deploy",
    href: "/live",
    heading: "Live, delivery and production controls",
    description:
      "Access live control, export feeds and production delivery settings for publishing-ready workflows.",
    cta: "Open Deploy",
    accent: "green",
    navGroup: "configure",
  },
  {
    title: "Plexa Dev Gateway",
    href: "/dev-gateway",
    heading: "Release checks and QA review",
    description:
      "Review release notes, diffs, changed files and Cursor plans before testing or deployment with advisory OpenAI QA.",
    cta: "Open Dev Gateway",
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

export type SupportCard = {
  title: string;
  href: string;
  description: string;
};

export const SUPPORT_CARDS: SupportCard[] = [
  { title: "Product", href: "/product", description: "Overview, features and use cases." },
  { title: "How It Works", href: "/how-it-works", description: "Step-by-step workflow guide." },
  { title: "Knowledge Base", href: "/knowledge-base", description: "AI learning sources and editorial memory." },
  { title: "Configure", href: "/configure", description: "Knowledge Base, tools, integrations and deploy." },
  { title: "Guard Rails", href: "/guard-rails", description: "Editorial and safety boundaries." },
  {
    title: "Brand Style Guides",
    href: "/configure/brand-style-guides",
    description: "Official PDF brand manuals and AI instructions for video and social.",
  },
  {
    title: "Brand Guidelines",
    href: "/brand-guidelines",
    description: "Planet Sport Studio visual and tone guidance.",
  },
  { title: "Prompts", href: "/prompts", description: "Prompt library and AI instructions." },
  { title: "Admin", href: "/admin", description: "Settings, integrations and keys." },
];

/** Extra links folded into a nav column (not duplicated as full dashboard cards). */
export const STUDIOS_MENU_VIDEO_EXTRAS: { title: string; href: string }[] = [];

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
