import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import { reconcilePlayerIntelligence } from "@/app/lib/match-report/reconcile-player-ratings";
import type { MatchReportProject, PlayerIntelligence, PlayerRatingEntry } from "@/app/lib/match-report/types";

const SYSTEM = `You are a football editor producing player ratings (1-10) for both teams.
Use ONLY facts from the EIO. When Opta/WhoScored ratings are provided, use them as ground truth for numeric scores.
Return JSON only.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fence ? fence[1]!.trim() : trimmed) as unknown;
}

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

  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OpenAI API key is not configured.");
  const settings = await readStoredSettingsAsync();
  const model =
    settings.languageOpenaiModel?.trim() ||
    process.env.LANGUAGE_OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const userPrompt = `${assembleEioPromptSections(project)}

${project.eventPicture ? `EVENT_PICTURE:\n${JSON.stringify(project.eventPicture, null, 2)}` : ""}

Return JSON: { ratings: [{ name, team: "home"|"away", rating: 1-10, justification, isSubstitute? }], manOfTheMatch?, narrativeDigest }
Cover BOTH teams when lineups exist. Do not invent stats.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const body = (await res.json()) as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
  if (!res.ok) throw new Error(body.error?.message || `OpenAI HTTP ${res.status}`);
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response.");
  const parsed = extractJson(content) as { ratings?: PlayerRatingEntry[]; manOfTheMatch?: string; narrativeDigest?: string };
  const ratings = Array.isArray(parsed.ratings) ? parsed.ratings.filter((r) => r.name && r.rating) : [];
  if (ratings.length === 0) throw new Error("No player ratings generated.");

  return reconcilePlayerIntelligence(project, {
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    ratings,
    manOfTheMatch: parsed.manOfTheMatch,
    narrativeDigest: parsed.narrativeDigest ?? "",
    generatedAt: new Date().toISOString(),
    model,
    usedOptaRatings: false,
  });
}
