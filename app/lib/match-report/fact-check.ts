import { buildMatchStoryContext } from "@/app/lib/match-report/story-engine";
import type {
  ArticleScore,
  FactCheckIssue,
  FactCheckIssueType,
  FactCheckSeverity,
  MatchReportFactCheck,
  MatchReportProject,
  SixLogicPlayer,
} from "@/app/lib/match-report/types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function displayName(player: SixLogicPlayer): string {
  const parts = player.name.trim().split(/\s+/);
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  return player.name.trim();
}

function addIssue(
  issues: FactCheckIssue[],
  input: Omit<FactCheckIssue, "id">,
): void {
  issues.push({ id: `fc-${issues.length + 1}`, ...input });
}

function lineups(project: MatchReportProject): { home: string[]; away: string[] } {
  const home = project.layers.sixLogic?.lineups.home;
  const away = project.layers.sixLogic?.lineups.away;
  return {
    home: [...(home?.starters ?? []), ...(home?.substitutes ?? [])].map(displayName),
    away: [...(away?.starters ?? []), ...(away?.substitutes ?? [])].map(displayName),
  };
}

function possessiveForms(team: string): string[] {
  const short = team
    .replace(/\bFootball Club\b/gi, "")
    .replace(/\bFC\b/gi, "")
    .trim();
  const forms = [team, short];
  const first = short.split(/\s+/)[0];
  if (first && first.length > 3) forms.push(first);
  return [...new Set(forms.filter(Boolean))].flatMap((name) => [`${name}'s`, `${name}’s`]);
}

function checkTeamPlayerMismatches(project: MatchReportProject, text: string, issues: FactCheckIssue[]): void {
  const rosters = lineups(project);
  const checks = [
    { wrongTeam: project.homeTeam, correctTeam: project.awayTeam, players: rosters.away },
    { wrongTeam: project.awayTeam, correctTeam: project.homeTeam, players: rosters.home },
  ];
  const haystack = normalize(text);
  for (const check of checks) {
    for (const player of check.players) {
      const playerKey = normalize(player);
      if (!playerKey || playerKey.split(" ").length < 2) continue;
      for (const form of possessiveForms(check.wrongTeam)) {
        const phrase = normalize(`${form} ${player}`);
        if (phrase && haystack.includes(phrase)) {
          addIssue(issues, {
            severity: "high",
            sourceTier: "tier1",
            type: "team_player_mismatch",
            title: `${player} assigned to wrong team`,
            detail: `The report appears to describe ${player} as belonging to ${check.wrongTeam}, but the Tier 1 lineup has them with ${check.correctTeam}.`,
            evidence: `${form} ${player}`,
            suggestion: `Rewrite this as ${check.correctTeam}'s ${player}, or remove the team possessive.`,
          });
        }
      }
    }
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function teamTokens(team: string): string[] {
  const short = team
    .replace(/\bFootball Club\b/gi, "")
    .replace(/\bFC\b/gi, "")
    .trim();
  const first = short.split(/\s+/)[0];
  return [...new Set([team, short, first].filter((name) => name && name.length > 3))];
}

function scoreNorm(home: number, away: number): string {
  return `${home} ${away}`;
}

function checkScore(project: MatchReportProject, text: string, issues: FactCheckIssue[]): void {
  if (project.homeScore == null || project.awayScore == null) return;
  const expected = `${project.homeScore}-${project.awayScore}`;
  const reverse = `${project.awayScore}-${project.homeScore}`;
  if (reverse === expected) return;

  const haystack = normalize(text);
  const expectedNorm = scoreNorm(project.homeScore, project.awayScore);
  const reverseNorm = scoreNorm(project.awayScore, project.homeScore);
  if (!haystack.includes(reverseNorm)) return;

  const canonicalPresent =
    haystack.includes(expectedNorm) ||
    teamTokens(project.homeTeam).some((name) =>
      new RegExp(`${escapeRegex(normalize(name))}\\s+${expectedNorm.replace(" ", "\\s+")}`, "i").test(haystack),
    ) ||
    teamTokens(project.awayTeam).some((name) =>
      new RegExp(`${expectedNorm.replace(" ", "\\s+")}\\s+${escapeRegex(normalize(name))}`, "i").test(haystack),
    );

  const homeTokens = teamTokens(project.homeTeam).map(normalize);
  const reversePattern = reverseNorm.replace(" ", "\\s+");
  const winnerPerspectiveOk = homeTokens.some((home) =>
    new RegExp(
      `(defeating|beat|beats|beating|overcame|saw off|downed|hammered|thumped|dismantled|despatched|defeated)\\s+${escapeRegex(home)}\\s+${reversePattern}`,
      "i",
    ).test(haystack),
  );

  const awayTokens = teamTokens(project.awayTeam).map(normalize);
  const misleadingHomeWinner = homeTokens.some(
    (home) =>
      awayTokens.some((away) =>
        new RegExp(`${escapeRegex(home)}\\s+${reversePattern}\\s+${escapeRegex(away)}`, "i").test(haystack),
      ) ||
      new RegExp(`(?:^|[.!?]\\s+)${escapeRegex(home)}\\s+${reversePattern}(?:\\s|$)`, "i").test(haystack),
  );

  if (canonicalPresent && (winnerPerspectiveOk || !misleadingHomeWinner)) return;

  addIssue(issues, {
    severity: "high",
    sourceTier: "tier1",
    type: "tier1_contradiction",
    title: "Possible reversed scoreline",
    detail: `The report contains ${reverse}, but Tier 1 match data says ${project.homeTeam} ${expected} ${project.awayTeam}.`,
    evidence: `${project.homeTeam} ${expected} ${project.awayTeam}`,
    suggestion: `Use ${project.homeTeam} ${expected} ${project.awayTeam}.`,
  });
}

function checkGoalScorers(project: MatchReportProject, text: string, issues: FactCheckIssue[]): void {
  const story = buildMatchStoryContext(project);
  for (const goal of story.events) {
    if (!goal.player) continue;
    const playerKey = normalize(goal.player);
    if (!normalize(text).includes(playerKey)) {
      addIssue(issues, {
        severity: "medium",
        sourceTier: "tier1",
        type: "tier1_contradiction",
        title: `Goal scorer not mentioned: ${goal.player}`,
        detail: `Tier 1 match events include ${goal.player} scoring${goal.minute != null ? ` on ${goal.minute}'` : ""}, but the report body does not clearly mention them.`,
        evidence: goal.detail,
        suggestion: `Include ${goal.player}${goal.minute != null ? ` (${goal.minute}')` : ""} in the goal narrative.`,
      });
    }
  }
}

function importedQuoteCorpus(project: MatchReportProject): string {
  return [
    ...project.layers.interviews.flatMap((row) => [row.transcriptText ?? "", row.digest, ...row.quotes.map((quote) => quote.quote)]),
    ...project.layers.manualSources.map((row) => row.excerpt),
    project.layers.loopFeed?.digest ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function checkUnsupportedQuotes(project: MatchReportProject, html: string, issues: FactCheckIssue[]): void {
  const corpus = importedQuoteCorpus(project);
  const quoteMatches = [...html.matchAll(/[“"]([^”"]{24,})[”"]/g)];
  for (const match of quoteMatches.slice(0, 8)) {
    const quote = match[1]?.trim();
    if (!quote) continue;
    const quoteKey = quote.toLowerCase().slice(0, 80);
    if (!corpus.includes(quoteKey.slice(0, 40))) {
      addIssue(issues, {
        severity: "medium",
        sourceTier: "tier2",
        type: "unsupported_quote",
        title: "Unsupported direct quote",
        detail: "Direct quotes need to appear in imported transcripts, manual sources or trusted Loop Feed/source material.",
        evidence: quote,
        suggestion: "Remove the quote, turn it into a clearly attributed paraphrase, or import the source transcript/link.",
      });
    }
  }
}

function checkPossessionConflicts(project: MatchReportProject, text: string, issues: FactCheckIssue[]): void {
  const story = buildMatchStoryContext(project);
  const possession = story.statisticsByPeriod.fullTime?.groups.matchOverview.ballPossession;
  if (!possession) return;
  const percentages = [...text.matchAll(/(\d{2})%\s+possession|possession[^.]{0,40}?(\d{2})%/gi)]
    .map((match) => Number.parseInt(match[1] ?? match[2] ?? "", 10))
    .filter((value) => Number.isFinite(value));
  const allowed = new Set([Number(possession.home), Number(possession.away)]);
  for (const value of percentages) {
    if (!allowed.has(value)) {
      addIssue(issues, {
        severity: "medium",
        sourceTier: "tier1",
        type: "stat_conflict",
        title: "Possession figure conflicts with match data",
        detail: `The report mentions ${value}% possession, but the normalised match data has ${project.homeTeam} ${possession.homeRaw} and ${project.awayTeam} ${possession.awayRaw}.`,
        evidence: `${project.homeTeam} ${possession.homeRaw}; ${project.awayTeam} ${possession.awayRaw}`,
        suggestion: "Use one consistent possession figure from the normalised match data.",
      });
    }
  }
}

function checkNarrativeClaims(project: MatchReportProject, text: string, issues: FactCheckIssue[]): void {
  const lower = text.toLowerCase();
  if (/dominated from start to finish|controlled from start to finish/.test(lower)) {
    addIssue(issues, {
      severity: "low",
      sourceTier: "tier3",
      type: "weak_tactical_claim",
      title: "Overbroad dominance claim",
      detail: "Broad tactical claims need support from momentum, xG, shots, territory or commentary data.",
      suggestion: `Use a more evidenced line, e.g. "${project.awayTeam} carried the greater chance quality after the opening exchanges."`,
    });
  }
}

function dimensionScore(max: number, penalty: number): number {
  return Math.max(0, max - penalty);
}

function articleScore(project: MatchReportProject, issues: FactCheckIssue[], text: string): ArticleScore {
  const high = issues.filter((issue) => issue.severity === "high").length;
  const medium = issues.filter((issue) => issue.severity === "medium").length;
  const low = issues.filter((issue) => issue.severity === "low").length;
  const quoteIssues = issues.filter((issue) => issue.type === "unsupported_quote").length;
  const brandHints = [project.editorial.brandStyle, project.editorial.brandStyleGuide ?? "", project.editorial.creatorStyleNotes]
    .join(" ")
    .trim();
  const hasCreator = Boolean(project.editorial.useCreatorProfile && project.editorial.creatorName);
  const paragraphs = (project.mediaOutputs?.reportHtml.match(/<p[\s>]/gi) ?? []).length;
  const opinionSignals = /\bshould\b|\bbut\b|\byet\b|\bhowever\b|\barguably\b|\bfrankly\b|\bsurely\b/i.test(text);
  const researchSignals = [
    project.layers.loopFeed,
    project.layers.leagueTable,
    project.layers.leagueSeasonStats,
    project.layers.optaPlayerData,
    project.layers.manualSources.length > 0,
    project.layers.interviews.length > 0,
  ].filter(Boolean).length;

  const dimensions = {
    factualAccuracy: dimensionScore(25, high * 12 + medium * 4 + low),
    researchDepth: Math.min(15, 7 + researchSignals * 2),
    insightQuality: Math.min(15, 8 + (project.eventPicture?.narrativeThreads.length ?? 0) + (project.layers.optaPlayerData ? 3 : 0)),
    journalistVoice: Math.min(15, hasCreator ? 13 : brandHints ? 10 : 7),
    brandFit: Math.min(15, project.editorial.targetBrand === "football365" ? 13 : 11),
    opinionHumour: opinionSignals ? 8 : 5,
    structureReadability: Math.min(5, paragraphs >= 8 ? 5 : paragraphs >= 4 ? 4 : 2),
  };
  let overall = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  if (high > 0) overall = Math.min(overall, 65);
  if (quoteIssues > 0) overall = Math.min(overall, 75);
  const status: ArticleScore["status"] =
    overall >= 90 ? "publish_ready" : overall >= 75 ? "needs_edit" : overall >= 60 ? "needs_rewrite" : "blocked";
  const topFixes = issues.slice(0, 3).map((issue) => issue.suggestion ?? issue.title);

  return {
    overall,
    status,
    dimensions,
    summary:
      issues.length === 0
        ? "No major factual warnings found. Editor should still check voice, quotes and house style."
        : `${issues.length} warning${issues.length === 1 ? "" : "s"} found before publish. Resolve high-severity Tier 1 issues first.`,
    topFixes,
  };
}

export function runMatchReportFactCheck(project: MatchReportProject): MatchReportFactCheck {
  if (!project.mediaOutputs) throw new Error("Generate media outputs before fact-checking.");
  const html = [project.mediaOutputs.headline, project.mediaOutputs.standfirst, project.mediaOutputs.reportHtml].join("\n");
  const text = stripHtml(html);
  const issues: FactCheckIssue[] = [];

  checkScore(project, text, issues);
  checkGoalScorers(project, text, issues);
  checkTeamPlayerMismatches(project, text, issues);
  checkPossessionConflicts(project, text, issues);
  checkUnsupportedQuotes(project, project.mediaOutputs.reportHtml, issues);
  checkNarrativeClaims(project, text, issues);

  const score = articleScore(project, issues, text);
  const blocked = issues.some((issue) => issue.severity === "high" && issue.sourceTier === "tier1");
  return {
    status: blocked ? "blocked" : issues.length > 0 ? "warnings" : "passed",
    issues,
    articleScore: score,
    storyContext: buildMatchStoryContext(project),
    checkedAt: new Date().toISOString(),
  };
}

export const FACT_CHECK_BLOCKING_ISSUE_TYPES: FactCheckIssueType[] = [
  "tier1_contradiction",
  "team_player_mismatch",
];
