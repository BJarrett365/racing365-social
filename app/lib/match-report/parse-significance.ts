import type { SignificanceIntelligence } from "@/app/lib/match-report/mio/types";

export function parseSignificance(raw: unknown): SignificanceIntelligence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const whyCare = typeof o.whyCare === "string" ? o.whyCare.trim() : "";
  const whyItMatters = typeof o.whyItMatters === "string" ? o.whyItMatters.trim() : "";
  const whatHappensNext = typeof o.whatHappensNext === "string" ? o.whatHappensNext.trim() : "";
  if (!whyCare && !whyItMatters) return undefined;
  return {
    whyCare,
    whyItMatters,
    whatHappensNext,
    tableImpact: typeof o.tableImpact === "string" ? o.tableImpact.trim() : undefined,
    confidence: typeof o.confidence === "number" ? o.confidence : 70,
    sourceLayers: Array.isArray(o.sourceLayers) ? o.sourceLayers.map(String) : [],
    digest: [whyCare, whyItMatters, whatHappensNext].filter(Boolean).join(" "),
  };
}
