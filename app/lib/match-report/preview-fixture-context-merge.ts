import { mergeFixtureContextChain } from "@/app/lib/match-report/merge-fixture-context";
import { fotMobPreviewToFixtureContext } from "@/app/lib/match-report/parse-fotmob-preview";
import type { FixtureContextIntelligence, MatchReportProject } from "@/app/lib/match-report/types";

/** Merged H2H / form / facts for preview generation (Six Logic + optional enrichments). */
export function getMergedPreviewFixtureContext(
  project: Pick<MatchReportProject, "layers">,
): FixtureContextIntelligence | null {
  const { fixtureContext, whoScoredPreview, fotMobPreview } = project.layers;
  const fotMobContext = fotMobPreview ? fotMobPreviewToFixtureContext(fotMobPreview) : null;
  return mergeFixtureContextChain(fixtureContext, whoScoredPreview, fotMobContext);
}
