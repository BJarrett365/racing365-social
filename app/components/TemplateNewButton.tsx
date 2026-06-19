"use client";

import { CreateTemplateButton } from "@/app/components/TemplateActions";
import { FootballLineupsNewButton } from "@/app/features/football-lineups/FootballLineupsNewButton";
import { PlanetFootballTableNewButton } from "@/app/features/planet-football/PlanetFootballTableNewButton";
import { PlanetRugbyTableNewButton } from "@/app/features/planet-rugby/PlanetRugbyTableNewButton";
import { RacecardTemplateNewButton } from "@/app/features/racecards/RacecardTemplateNewButton";
import { TeamLineUpNewButton } from "@/app/features/team-line-up/TeamLineUpNewButton";
import { TeamSheetNewButton } from "@/app/features/team-sheet/TeamSheetNewButton";
import { ScoreLineNewButton } from "@/app/features/score-line/ScoreLineNewButton";
import type { TeamSheetVariant } from "@/types";

export type TeamLineUpNewDefaults = {
  defaultViewMode?: never;
  defaultSheetVariant?: never;
  buttonLabel?: string;
  modalTitle?: string;
};

export type TeamSheetNewDefaults = {
  defaultSheetVariant?: TeamSheetVariant;
  buttonLabel?: string;
  modalTitle?: string;
};

export type TemplateFormatKey =
  | "next-off"
  | "fast-results"
  | "racecard"
  | "teamtalk-news"
  | "f1-grid"
  | "f1-results"
  | "planet-football-table"
  | "planet-rugby-table"
  | "team-line-up"
  | "team-sheet"
  | "score-line"
  | "football-lineups";

/** Single entry point for "New template" on hub cards and list headers. */
export function TemplateNewButton({
  format,
  editorBasePath = "/editor",
  teamLineUpDefaults,
  teamSheetDefaults,
}: {
  format: TemplateFormatKey;
  editorBasePath?: "/editor" | "/landscape/editor";
  teamLineUpDefaults?: TeamLineUpNewDefaults;
  teamSheetDefaults?: TeamSheetNewDefaults;
}) {
  switch (format) {
    case "racecard":
      return <RacecardTemplateNewButton editorBasePath={editorBasePath} />;
    case "team-line-up":
      return (
        <TeamLineUpNewButton
          editorBasePath={editorBasePath}
          buttonLabel={teamLineUpDefaults?.buttonLabel ?? "New template"}
          modalTitle={teamLineUpDefaults?.modalTitle ?? "New template"}
        />
      );
    case "team-sheet":
      return (
        <TeamSheetNewButton
          editorBasePath={editorBasePath}
          buttonLabel={teamSheetDefaults?.buttonLabel ?? "New template"}
          modalTitle={teamSheetDefaults?.modalTitle ?? "New template"}
          defaultSheetVariant={teamSheetDefaults?.defaultSheetVariant ?? "split"}
        />
      );
    case "score-line":
      return <ScoreLineNewButton editorBasePath={editorBasePath} />;
    case "football-lineups":
      return (
        <FootballLineupsNewButton
          editorBasePath={editorBasePath}
          buttonLabel="New template"
          modalTitle="New template"
        />
      );
    case "planet-football-table":
      return <PlanetFootballTableNewButton editorBasePath={editorBasePath} />;
    case "planet-rugby-table":
      return <PlanetRugbyTableNewButton editorBasePath={editorBasePath} />;
    default:
      return <CreateTemplateButton format={format} editorBasePath={editorBasePath} />;
  }
}
