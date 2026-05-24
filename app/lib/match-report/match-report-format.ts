import type {
  MatchReportFormat,
  MatchReportPerspective,
  MatchReportProject,
  MatchReportScope,
} from "@/app/lib/match-report/types";

export type MatchReportFormatOption = {
  id: MatchReportFormat;
  label: string;
  shortLabel: string;
  description: string;
  createsDualReports?: boolean;
};

export const DEFAULT_MATCH_REPORT_FORMAT: MatchReportFormat = "neutral";

export const MATCH_REPORT_FORMAT_OPTIONS: MatchReportFormatOption[] = [
  {
    id: "neutral",
    label: "Match report · Neutral",
    shortLabel: "Neutral",
    description:
      "Full-time report with balanced coverage of both teams — one report, neither club favoured in framing or narrative.",
  },
  {
    id: "home",
    label: "Match report · Home",
    shortLabel: "Home",
    description: "Full-time report from the home club’s perspective — angles, quotes, and narrative favour the home team.",
  },
  {
    id: "away",
    label: "Match report · Away",
    shortLabel: "Away",
    description: "Full-time report from the away club’s perspective — same facts, away-first framing and tone.",
  },
  {
    id: "live_first_half",
    label: "Live / first-half report",
    shortLabel: "Live · HT",
    description: "In-play or half-time report covering events in the first 45 minutes only (0–45).",
  },
  {
    id: "neutral_dual",
    label: "Neutral · Home + Away (two reports)",
    shortLabel: "Dual",
    description:
      "Creates two linked reports from one import — a home-perspective report and an away-perspective report you can edit and publish separately.",
    createsDualReports: true,
  },
];

export function isDualReportFormat(format: MatchReportFormat): boolean {
  return format === "neutral_dual";
}

export function resolveReportScope(format: MatchReportFormat, scope?: MatchReportScope): MatchReportScope {
  if (format === "live_first_half") return "first_half";
  return scope ?? "full";
}

export function storedReportFormat(format: MatchReportFormat): MatchReportPerspective {
  if (format === "away") return "away";
  if (format === "live_first_half") return "live_first_half";
  if (format === "neutral") return "neutral";
  return "home";
}

export function matchReportFormatLabel(format: MatchReportFormat | undefined): string {
  if (!format) return "Match report · Neutral";
  return MATCH_REPORT_FORMAT_OPTIONS.find((row) => row.id === format)?.label ?? format;
}

export function matchReportFormatShortLabel(format: MatchReportFormat | undefined): string {
  if (!format) return "Neutral";
  return MATCH_REPORT_FORMAT_OPTIONS.find((row) => row.id === format)?.shortLabel ?? format;
}

export function matchReportPerspectivePrompt(project: MatchReportProject): string {
  const home = project.homeTeam;
  const away = project.awayTeam;

  if (project.reportFormat === "home") {
    return `Write from the HOME team perspective (${home}). Lead with ${home} angles, priorities, and reactions. ${away} context supports the story but ${home} is the editorial centre.`;
  }
  if (project.reportFormat === "away") {
    return `Write from the AWAY team perspective (${away}). Lead with ${away} angles, priorities, and reactions. ${home} context supports the story but ${away} is the editorial centre.`;
  }
  if (project.reportFormat === "live_first_half") {
    return `This is a LIVE / FIRST-HALF report only. Cover events in the first 45 minutes. Do not write as if the match is finished unless facts confirm full time. Balanced match narrative — not home- or away-biased unless facts demand it.`;
  }
  if (project.reportFormat === "neutral") {
    return `Write a NEUTRAL full-match report covering both ${home} and ${away} equally. Do not favour either club in framing, headlines, or narrative unless facts clearly demand it. Balance quotes, analysis, and player ratings across both sides.`;
  }
  return `Balanced full-match report covering both ${home} and ${away}.`;
}
