import type { Sport365MatchPageSummary } from "@/app/lib/match-report/parse-sport365-match-page-summary";
import type { ScoreLineBundle, Sport365MatchContext, TeamLineUpBrandStyle } from "@/types";

export function matchSummaryToContext(match: Sport365MatchPageSummary): Sport365MatchContext {
  return {
    sourceUrl: match.sourceUrl,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    statusLabel: match.statusLabel,
    homeLogoUrl: match.homeLogoUrl,
    awayLogoUrl: match.awayLogoUrl,
    scorers: match.scorers,
    commentaryDigest: match.commentaryDigest,
  };
}

export function sport365MatchToScoreLineBundle(
  id: string,
  match: Sport365MatchPageSummary,
  brandStyle: TeamLineUpBrandStyle = "sport365",
  meta?: { competition?: string; matchDate?: string },
): ScoreLineBundle {
  return {
    id,
    brandStyle,
    exportAspect: "portrait",
    matchContext: matchSummaryToContext(match),
    sourceUrl: match.sourceUrl,
    competition: meta?.competition,
    matchDate: meta?.matchDate,
    generateAiCaption: true,
    aiCaption: buildScoreLineCaption(matchSummaryToContext(match)),
  };
}

export function buildScoreLineCaption(ctx: Sport365MatchContext): string {
  const status = displayScoreLineStatus(ctx.statusLabel, ctx.status);
  const score = `${ctx.homeTeam} ${ctx.homeScore}-${ctx.awayScore} ${ctx.awayTeam}`;
  const scorers = ctx.scorers
    .filter((s) => s.player?.trim())
    .map((s) => `${s.player}${s.type === "own_goal" ? " (OG)" : ""} ${s.minuteLabel}`)
    .join(", ");
  const parts = [score, status !== "FULL TIME" ? status : "Full time"];
  if (scorers) parts.push(scorers);
  return parts.join(". ") + ".";
}

export function displayScoreLineStatus(statusLabel?: string, status?: string): string {
  const raw = (statusLabel ?? status ?? "").trim();
  if (!raw) return "FULL TIME";
  if (/finished|full.?time|final whistle/i.test(raw)) return "FULL TIME";
  if (/half.?time|^HT$/i.test(raw)) return "HALF TIME";
  if (/live|in play|1st half|2nd half/i.test(raw)) return raw.toUpperCase();
  return raw.toUpperCase();
}
