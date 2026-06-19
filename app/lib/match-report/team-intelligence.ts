import type {
  TeamIntelligence,
  TeamIntelligenceConfidenceLabel,
  TeamIntelligencePlayerStatus,
} from "@/app/lib/match-report/mio/types";
import type { ManualSource, MatchReportProject } from "@/app/lib/match-report/types";

const SOCIAL_RUMOUR = /\b(rumou?r|twitter|x\.com|instagram|tiktok|leaked|exclusive sources say)\b/i;
const INJURY = /\b(injur|doubt|fitness|hamstring|knee|ankle|muscle|strain)\b/i;
const SUSPENSION = /\b(suspend|ban|red card|disciplinary)\b/i;
const RETURN = /\b(return|back in|available|recovered|cleared)\b/i;

function confidenceLabel(score: number): TeamIntelligenceConfidenceLabel {
  if (score >= 100) return "confirmed";
  if (score >= 80) return "expected";
  if (score >= 60) return "predicted";
  return "possible_changes";
}

function sourceTier(source: string): 1 | 2 | 3 {
  if (/official|club|fa\.com|premierleague\.com/i.test(source)) return 1;
  if (/bbc|sky sports|the athletic|guardian|telegraph|times/i.test(source)) return 2;
  return 3;
}

function isExcludedSource(row: ManualSource): boolean {
  const blob = `${row.source} ${row.title ?? ""} ${row.excerpt}`;
  if (SOCIAL_RUMOUR.test(blob) && sourceTier(row.source) >= 3) return true;
  return false;
}

function parsePlayerStatus(row: ManualSource, team: "home" | "away"): TeamIntelligencePlayerStatus | null {
  const text = `${row.title ?? ""} ${row.excerpt}`;
  if (!INJURY.test(text) && !SUSPENSION.test(text) && !RETURN.test(text)) return null;
  const tier = sourceTier(row.source);
  if (tier === 3 && SOCIAL_RUMOUR.test(text)) return null;

  let status: TeamIntelligencePlayerStatus["status"] = "doubt";
  if (SUSPENSION.test(text)) status = "suspended";
  else if (RETURN.test(text)) status = "returning";
  else if (INJURY.test(text)) status = "injured";

  const confidence = tier === 1 ? 100 : tier === 2 ? 85 : 65;
  const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+)+)/);
  const name = nameMatch?.[1] ?? "Player (see source)";

  return {
    name,
    team,
    status,
    detail: text.slice(0, 280),
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    source: row.source,
    sourceTier: tier,
  };
}

/** Extract structured Team Intelligence from manual sources + SixLogics lineups. No social rumours. */
export function extractTeamIntelligence(project: MatchReportProject): TeamIntelligence {
  const homeTeam = project.homeTeam;
  const awayTeam = project.awayTeam;
  const playerStatuses: TeamIntelligencePlayerStatus[] = [];

  for (const row of project.layers.manualSources) {
    if (isExcludedSource(row)) continue;
    const sideLabel = row.loopFeedSideLabel?.toLowerCase() ?? "";
    const team: "home" | "away" =
      sideLabel.includes(homeTeam.toLowerCase()) || /home/i.test(sideLabel)
        ? "home"
        : sideLabel.includes(awayTeam.toLowerCase()) || /away/i.test(sideLabel)
          ? "away"
          : "home";
    const parsed = parsePlayerStatus(row, team);
    if (parsed) playerStatuses.push(parsed);
  }

  const foundation = project.layers.sixLogic;
  const homePredictedXi =
    foundation?.lineups.home.starters.map((p) => ({
      name: p.name,
      position: p.position,
      confidence: p.name ? 100 : 60,
      confidenceLabel: confidenceLabel(p.name ? 100 : 60),
    })) ?? [];
  const awayPredictedXi =
    foundation?.lineups.away.starters.map((p) => ({
      name: p.name,
      position: p.position,
      confidence: p.name ? 100 : 60,
      confidenceLabel: confidenceLabel(p.name ? 100 : 60),
    })) ?? [];

  const overallConfidence =
    playerStatuses.length > 0
      ? Math.round(playerStatuses.reduce((a, s) => a + s.confidence, 0) / playerStatuses.length)
      : homePredictedXi.length + awayPredictedXi.length > 0
        ? 80
        : 50;

  const digest = [
    playerStatuses.length
      ? `Player statuses (${playerStatuses.length}): ${playerStatuses.map((s) => `${s.name} (${s.status}, ${s.confidenceLabel})`).join("; ")}`
      : "No structured injury/suspension rows from Tier 1–2 sources.",
    homePredictedXi.length
      ? `Home XI (${confidenceLabel(homePredictedXi[0]?.confidence ?? 60)}): ${homePredictedXi.map((p) => p.name).join(", ")}`
      : "Home XI: not confirmed in feed.",
    awayPredictedXi.length
      ? `Away XI (${confidenceLabel(awayPredictedXi[0]?.confidence ?? 60)}): ${awayPredictedXi.map((p) => p.name).join(", ")}`
      : "Away XI: not confirmed in feed.",
  ].join("\n");

  return {
    homeTeam,
    awayTeam,
    playerStatuses,
    homePredictedXi,
    awayPredictedXi,
    digest,
    overallConfidence,
    sourceLayers: ["manual_sources", "sixLogic"],
    generatedAt: new Date().toISOString(),
  };
}
