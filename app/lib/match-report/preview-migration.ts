import type { MatchReportContentType } from "@/app/lib/match-report/types";

/** Data Studio path — raw FIXTURE_JSON preview (legacy). */
export const DATA_STUDIO_PREVIEW_MODULE = "app/lib/data-studio/match-copy-ai.ts";

/** Builder PIO path (target). */
export const BUILDER_PIO_MODULE = "app/lib/match-report/pio-summaries.ts";

export type PreviewMigrationPhase = "v1_types" | "v1_pio" | "v1_media" | "v2_banner" | "v2_redirect" | "v3_remove";

export const PREVIEW_MIGRATION_PHASES: Array<{
  id: PreviewMigrationPhase;
  label: string;
  description: string;
}> = [
  {
    id: "v1_types",
    label: "V1 — Types & workflow",
    description: "contentType match_preview, preview workflow constants, calendar preview fields.",
  },
  {
    id: "v1_pio",
    label: "V1 — PIO assembly",
    description: "assemblePioPromptSections replaces raw FIXTURE_JSON for preview generation.",
  },
  {
    id: "v1_media",
    label: "V1.1 — Preview media builder",
    description: "generate-preview-media.ts using PIO + MATCH_PREVIEW_PLANET_SPORT_PROMPT.",
  },
  {
    id: "v2_banner",
    label: "V2 — Data Studio banner",
    description: "Show migration notice on Data Studio preview mode.",
  },
  {
    id: "v2_redirect",
    label: "V2.1 — Deep-link redirect",
    description: "Data Studio preview button opens Match Report Builder with content_type=match_preview.",
  },
  {
    id: "v3_remove",
    label: "V3 — Remove legacy path",
    description: "Delete raw-JSON preview from match-copy-ai.ts.",
  },
];

export function builderDeepLinkForPreview(params: {
  matchId: string;
  sportId?: string;
  brand: string;
  competition?: string;
}): string {
  const q = new URLSearchParams();
  q.set("match_id", params.matchId);
  q.set("sport_id", params.sportId ?? "1");
  q.set("brand", params.brand);
  q.set("content_type", "match_preview");
  if (params.competition) q.set("competition", params.competition);
  return `/match-report-builder?${q.toString()}`;
}

export function parityChecklist(): Array<{ item: string; module: string; done: boolean }> {
  return [
    { item: "Form + H2H from SixLogics", module: BUILDER_PIO_MODULE, done: true },
    { item: "Loop Feed integration", module: "preview-workflow.ts", done: true },
    { item: "League table + season stats", module: "preview-workflow.ts", done: true },
    { item: "Brand/creator governance", module: "pio-summaries.ts", done: true },
    { item: "Language Studio publish", module: "language-studio-bridge.ts", done: false },
    { item: "Fixture calendar linkage", module: "fixture-calendar.ts", done: true },
    { item: "Preview fact-check", module: "preview-fact-check.ts", done: true },
    { item: "Preview media generation", module: "generate-preview-media.ts", done: false },
  ];
}

export function recommendedCalendarPhase(contentType: MatchReportContentType): "pre_match" | "report_post" {
  return contentType === "match_preview" ? "pre_match" : "report_post";
}
