import type { SportVertical } from "@/app/lib/data-studio/types";

export const SPORT_VERTICALS: SportVertical[] = [
  {
    id: "football",
    label: "Football",
    shortDescription: "Match previews (stakes, team news, odds) and post-match reports from feeds.",
    dataFeedNote:
      "Same fixture JSON can back a Football365-style preview before kick-off and a report after — plus rewrite / translation.",
  },
  {
    id: "horse_racing",
    label: "Horse Racing",
    shortDescription: "Race previews, racecards and results — Racing365 and partner data feeds.",
    dataFeedNote:
      "Use your provider’s sport / race IDs (e.g. SixLogics `sport_id` for racing when supplied). Map runners, odds, declarations/scratchings, sectional or stewards’ notes into previews and results reports.",
  },
  {
    id: "rugby_union",
    label: "Rugby Union",
    shortDescription: "Pre-match previews and reports — Planet Rugby / partner feeds.",
    dataFeedNote:
      "Preview/report prompts adapt terminology (pack, set-piece, phases); normalised data feeds the same pipeline.",
  },
  {
    id: "rugby_league",
    label: "Rugby League",
    shortDescription: "Love Rugby League-style previews and round recaps.",
    dataFeedNote:
      "Fixtures, squads and scores seed previews and full-time reports with optional player ratings.",
  },
  {
    id: "cricket",
    label: "Cricket",
    shortDescription: "Toss-to-tea previews and innings reports — Cricket365 tone.",
    dataFeedNote:
      "Use pitch/weather/squad when supplied for previews; reports led by result and session arcs.",
  },
  {
    id: "tennis",
    label: "Tennis",
    shortDescription: "Tennis365-style draw previews and match reports.",
    dataFeedNote:
      "Head-to-head, surface and schedule for previews; breakpoints and serve narrative for reports.",
  },
  {
    id: "f1",
    label: "F1",
    shortDescription: "Session previews (grid, tyres, weather) and race reports — PlanetF1.",
    dataFeedNote:
      "FP/quali/race timing feeds map to the same preview vs report prompts with F1 terminology.",
  },
  {
    id: "multi",
    label: "All sports",
    shortDescription: "Cross-vertical prompts and house style.",
    dataFeedNote:
      "Shared imports and learning references that apply across verticals.",
  },
];
