import { aiChatJsonObject } from "@/app/lib/ai";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import { reconcilePlayerIntelligence } from "@/app/lib/match-report/reconcile-player-ratings";
import type { MatchReportProject, PlayerIntelligence, PlayerRatingEntry } from "@/app/lib/match-report/types";

const SYSTEM = `You are a football editor producing player ratings (1-10) for both teams.
Use ONLY facts from the EIO. When Opta/WhoScored ratings are provided, use them as ground truth for numeric scores.
Return JSON only.`;

function ratingsFromOpta(project: MatchReportProject): PlayerRatingEntry[] | null {
  const opta = project.layers.optaPlayerData;
  if (!opta?.players?.length) return null;
  return opta.players
    .filter((p) => p.summary.rating !== undefined)
    .map((p) => ({
      name: p.name,
      team: p.team,
      rating: p.summary.rating!,
      position: p.position,
      justification: p.statSummary || `${p.position ?? "Player"} — ${p.summary.goals ?? 0}G ${p.summary.assists ?? 0}A`,
      isSubstitute: p.isSubstitute,
    }));
}

export async function runPlayerIntelligenceJob(project: MatchReportProject): Promise<PlayerIntelligence> {
  const optaRatings = ratingsFromOpta(project);
  if (optaRatings && optaRatings.length >= 8) {
    return reconcilePlayerIntelligence(project, {
      homeTeam: project.homeTeam,
      awayTeam: project.awayTeam,
      ratings: optaRatings,
      manOfTheMatch: project.layers.optaPlayerData?.manOfTheMatch?.name,
      narrativeDigest: project.layers.optaPlayerData?.summaryDigest ?? "",
      generatedAt: new Date().toISOString(),
      usedOptaRatings: true,
    });
  }

  const userPrompt = `${assembleEioPromptSections(project)}

${project.eventPicture ? `EVENT_PICTURE:\n${JSON.stringify(project.eventPicture, null, 2)}` : ""}

Return JSON: { ratings: [{ name, team: "home"|"away", rating: 1-10, justification, isSubstitute? }], manOfTheMatch?, narrativeDigest }
Cover BOTH teams when lineups exist. Do not invent stats.`;

  const { data, meta } = await aiChatJsonObject({
    task: "entity_extraction",
    system: SYSTEM,
    user: userPrompt,
    temperature: 0.35,
    json: true,
  });
  const parsed = data as { ratings?: PlayerRatingEntry[]; manOfTheMatch?: string; narrativeDigest?: string };
  const ratings = Array.isArray(parsed.ratings) ? parsed.ratings.filter((r) => r.name && r.rating) : [];
  if (ratings.length === 0) throw new Error("No player ratings generated.");

  return reconcilePlayerIntelligence(project, {
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    ratings,
    manOfTheMatch: parsed.manOfTheMatch,
    narrativeDigest: parsed.narrativeDigest ?? "",
    generatedAt: new Date().toISOString(),
    model: meta.model,
    usedOptaRatings: false,
  });
}
