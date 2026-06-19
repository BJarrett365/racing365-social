import type { TeamLineUpNewDefaults, TeamSheetNewDefaults, TemplateFormatKey } from "@/app/components/TemplateNewButton";

export type HubPipeline = {
  id: string;
  title: string;
  description: string;
  listPath: string;
  exampleSlug: string;
  previewFormat?: string;
  format?: TemplateFormatKey;
  teamLineUpDefaults?: TeamLineUpNewDefaults;
  teamSheetDefaults?: TeamSheetNewDefaults;
  previewPlaceholder?: { label: string; hint: string };
};

/** Sport365 line-up pipelines for Shorts Studio and Landscape Studio hubs. */
export function sport365HubPipelines(mode: "portrait" | "landscape"): HubPipeline[] {
  const sheetList = mode === "landscape" ? "/team-sheet?mode=landscape" : "/team-sheet";
  const formationList = mode === "landscape" ? "/team-line-up?mode=landscape" : "/team-line-up";

  return [
    {
      id: "team-line-up",
      title: "Team Line-Up (Formation)",
      description:
        "Sport365 Match Centre import — tactical pitch cards with formations, kit intelligence, and multi-brand styling.",
      listPath: formationList,
      exampleSlug: "team-line-up",
      previewFormat: "team-line-up",
      format: "team-line-up",
      teamLineUpDefaults: {
        buttonLabel: "New formation line-up",
        modalTitle: "Formation line-up",
      },
    },
    {
      id: "team-sheet-split",
      title: "Split Team Sheet",
      description:
        "Player image left, starting XI right — Barcelona / LaLiga style. Best for confirmed line-ups and matchday posts.",
      listPath: sheetList,
      exampleSlug: "team-sheet-split",
      previewFormat: "team-sheet",
      format: "team-sheet",
      teamSheetDefaults: {
        defaultSheetVariant: "split",
        buttonLabel: "New split team sheet",
        modalTitle: "Split Team Sheet",
      },
      previewPlaceholder: { label: "Split layout", hint: "Image left · XI right" },
    },
    {
      id: "team-sheet-standard",
      title: "Team Sheet",
      description: "Hero player image on top with full starting XI and subs below. Fast, mobile-first social card.",
      listPath: sheetList,
      exampleSlug: "team-sheet-standard",
      previewFormat: "team-sheet",
      format: "team-sheet",
      teamSheetDefaults: {
        defaultSheetVariant: "standard",
        buttonLabel: "New team sheet",
        modalTitle: "Team Sheet",
      },
      previewPlaceholder: { label: "Standard", hint: "Image + XI list" },
    },
    {
      id: "team-sheet-hero",
      title: "Hero Line-Up",
      description: "Full-bleed player image with grouped XI (GK / Def / Mid / Fwd). High-impact breaking news graphic.",
      listPath: sheetList,
      exampleSlug: "team-sheet-hero",
      previewFormat: "team-sheet",
      format: "team-sheet",
      teamSheetDefaults: {
        defaultSheetVariant: "hero",
        buttonLabel: "New hero line-up",
        modalTitle: "Hero Line-Up",
      },
      previewPlaceholder: { label: "Hero layout", hint: "Full-bleed + grouped XI" },
    },
    {
      id: "score-line-full",
      title: "Score Line",
      description:
        "Full-bleed hero image with branded full-time score overlay — team flags, accent scoreline, Sport365 import.",
      listPath: mode === "landscape" ? "/score-line?mode=landscape" : "/score-line",
      exampleSlug: "score-line-full",
      previewFormat: "score-line",
      format: "score-line",
      previewPlaceholder: { label: "Score line", hint: "Hero + FT overlay" },
    },
    {
      id: "team-sheet-combined",
      title: "Combined Team Sheets",
      description: "Both teams on one card — home and away starting XIs side by side. Ideal for pre-match posts.",
      listPath: sheetList,
      exampleSlug: "team-sheet-combined",
      previewFormat: "team-sheet",
      format: "team-sheet",
      teamSheetDefaults: {
        defaultSheetVariant: "combined",
        buttonLabel: "New combined sheet",
        modalTitle: "Combined Team Sheets",
      },
      previewPlaceholder: { label: "Combined", hint: "Home + away on one card" },
    },
  ];
}
