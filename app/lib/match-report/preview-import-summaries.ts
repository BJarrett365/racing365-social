import type { FixtureContextIntelligence, FotMobPreviewIntelligence } from "@/app/lib/match-report/types";

export function sixLogicFixtureImportLines(ctx: FixtureContextIntelligence): string[] {
  const lines: string[] = [];
  if (ctx.headToHead.length > 0) lines.push(`${ctx.headToHead.length} head-to-head meeting${ctx.headToHead.length === 1 ? "" : "s"}`);
  if (ctx.homeRecentResults.length > 0) {
    lines.push(`${ctx.homeRecentResults.length} home recent result${ctx.homeRecentResults.length === 1 ? "" : "s"}`);
  }
  if (ctx.awayRecentResults.length > 0) {
    lines.push(`${ctx.awayRecentResults.length} away recent result${ctx.awayRecentResults.length === 1 ? "" : "s"}`);
  }
  if (ctx.homeNextFixture?.opponent || ctx.homeNextFixture?.sixLogicMatchId) {
    lines.push("Home next fixture");
  }
  if (ctx.awayNextFixture?.opponent || ctx.awayNextFixture?.sixLogicMatchId) {
    lines.push("Away next fixture");
  }
  if (ctx.seasonDouble?.completed) lines.push("Season double complete");
  else if (ctx.seasonDouble?.homeMeeting || ctx.seasonDouble?.awayMeeting) {
    lines.push("Partial season double");
  }
  return lines;
}

export function whoScoredPreviewImportLines(ctx: FixtureContextIntelligence): string[] {
  const lines = sixLogicFixtureImportLines(ctx);
  if (ctx.matchFacts && ctx.matchFacts.length > 0) {
    lines.push(`${ctx.matchFacts.length} match fact${ctx.matchFacts.length === 1 ? "" : "s"} / forecast line${ctx.matchFacts.length === 1 ? "" : "s"}`);
  }
  return lines.length > 0 ? lines : ["WhoScored preview page parsed"];
}

export function fotMobPreviewImportLines(preview: FotMobPreviewIntelligence): string[] {
  const lines: string[] = [];
  if (preview.aboutTheMatch) lines.push("About the match");
  if (preview.headToHead.length > 0) {
    lines.push(`${preview.headToHead.length} head-to-head meeting${preview.headToHead.length === 1 ? "" : "s"}`);
  }
  if (preview.homeRecentResults.length > 0 || preview.awayRecentResults.length > 0) {
    lines.push(
      `Team form (${preview.homeRecentResults.length} home · ${preview.awayRecentResults.length} away)`,
    );
  }
  if (preview.homeLineup?.starters.length) {
    lines.push(
      `${preview.homeLineup.team} ${preview.homeLineup.formation ?? ""} — ${preview.homeLineup.lineupLabel} (${preview.homeLineup.starters.length} starters${preview.homeLineup.bench.length ? `, ${preview.homeLineup.bench.length} bench` : ""})`.trim(),
    );
  }
  if (preview.awayLineup?.starters.length) {
    lines.push(
      `${preview.awayLineup.team} ${preview.awayLineup.formation ?? ""} — ${preview.awayLineup.lineupLabel} (${preview.awayLineup.starters.length} starters${preview.awayLineup.bench.length ? `, ${preview.awayLineup.bench.length} bench` : ""})`.trim(),
    );
  }
  if (preview.winProbability.summary || preview.winProbability.pollInsights.length > 0) {
    lines.push("Win probability / prediction insights");
  }
  if (preview.teamInsights.length > 0) {
    lines.push(`${preview.teamInsights.length} team insight${preview.teamInsights.length === 1 ? "" : "s"}`);
  }
  if (preview.playerInsights.length > 0) {
    lines.push(`${preview.playerInsights.length} player insight${preview.playerInsights.length === 1 ? "" : "s"}`);
  }
  if (preview.statsComparison.rows.length > 0) {
    lines.push(`${preview.statsComparison.rows.length} stats comparison row${preview.statsComparison.rows.length === 1 ? "" : "s"}`);
  } else if (preview.statsComparison.note) {
    lines.push("Stats comparison note (limited pre-kickoff)");
  }
  if (preview.venue?.name) lines.push(`Venue: ${preview.venue.name}`);
  if (preview.referee) lines.push(`Referee: ${preview.referee}`);
  return lines;
}

export function formatImportLinesBulletList(lines: string[]): string {
  return lines.map((line) => `• ${line}`).join("\n");
}
