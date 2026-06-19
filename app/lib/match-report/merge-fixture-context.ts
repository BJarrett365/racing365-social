import type { FixtureContextIntelligence, FixtureMeetingSnapshot } from "@/app/lib/match-report/types";

function pickMeetings(primary: FixtureMeetingSnapshot[], secondary: FixtureMeetingSnapshot[]): FixtureMeetingSnapshot[] {
  return primary.length > 0 ? primary : secondary;
}

function uniqueFacts(facts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const fact of facts) {
    const key = fact.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(fact.trim());
  }
  return out;
}

/** Merge multiple supplemental fixture-context layers left-to-right. */
export function mergeFixtureContextChain(
  ...contexts: Array<FixtureContextIntelligence | null | undefined>
): FixtureContextIntelligence | null {
  return contexts.reduce<FixtureContextIntelligence | null>(
    (acc, next) => mergeFixtureContextIntelligence(acc, next ?? null),
    null,
  );
}

/** Prefer SixLogic for structure; fill gaps from WhoScored / FotMob supplemental feeds. */
export function mergeFixtureContextIntelligence(
  primary: FixtureContextIntelligence | null,
  supplemental: FixtureContextIntelligence | null,
): FixtureContextIntelligence | null {
  if (!primary && !supplemental) return null;
  if (!primary) return supplemental;
  if (!supplemental) return primary;

  const headToHead = pickMeetings(primary.headToHead, supplemental.headToHead);
  const homeRecentResults = pickMeetings(primary.homeRecentResults, supplemental.homeRecentResults);
  const awayRecentResults = pickMeetings(primary.awayRecentResults, supplemental.awayRecentResults);

  const digestParts = [primary.digest, supplemental.digest].filter((part) => part?.trim());
  const matchFacts = uniqueFacts([...(primary.matchFacts ?? []), ...(supplemental.matchFacts ?? [])]).slice(0, 24);
  if (matchFacts.length > 0) {
    digestParts.push(["Match facts:", ...matchFacts.map((fact) => `- ${fact}`)].join("\n"));
  }

  return {
    sourceUrl: supplemental.sourceUrl || primary.sourceUrl,
    matchPageId: primary.matchPageId ?? supplemental.matchPageId,
    headToHead,
    homeRecentResults,
    awayRecentResults,
    homeNextFixture: primary.homeNextFixture ?? supplemental.homeNextFixture,
    awayNextFixture: primary.awayNextFixture ?? supplemental.awayNextFixture,
    seasonDouble: primary.seasonDouble ?? supplemental.seasonDouble,
    matchFacts: matchFacts.length > 0 ? matchFacts : undefined,
    digest: digestParts.join("\n\n"),
    importedAt: new Date().toISOString(),
  };
}
