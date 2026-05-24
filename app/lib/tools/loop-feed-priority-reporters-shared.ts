import type { SportVerticalId } from "@/app/lib/data-studio/types";
import type { ManualSourceType } from "@/app/lib/match-report/types";

export const LOOP_FEED_REPORTER_ROLE_CATEGORIES = [
  { id: "journalist", label: "Journalist" },
  { id: "commentator", label: "Commentator" },
  { id: "influencer", label: "Influencer" },
  { id: "broadcaster", label: "Broadcaster" },
  { id: "reporter", label: "Reporter" },
  { id: "social_media", label: "Social media" },
] as const;

export type LoopFeedReporterRoleCategory = (typeof LOOP_FEED_REPORTER_ROLE_CATEGORIES)[number]["id"];

export type LoopFeedReporterAffiliationScope = "team" | "generic";

export const LOOP_FEED_REPORTER_AFFILIATION_SCOPES = [
  { id: "team", label: "Team" },
  { id: "generic", label: "Generic" },
] as const;

export const LOOP_FEED_REPORTER_OUTLETS = [
  { id: "bbc", label: "BBC" },
  { id: "sky", label: "Sky" },
  { id: "athletic", label: "The Athletic" },
  { id: "blog", label: "Blog / independent" },
  { id: "other", label: "Other" },
] as const;

export type LoopFeedReporterOutletId = (typeof LOOP_FEED_REPORTER_OUTLETS)[number]["id"];

export type LoopFeedPriorityReporterRow = {
  id: string;
  sportKey: SportVerticalId;
  name: string;
  /** X/Twitter handle without leading @ */
  xHandle?: string;
  /** Alternate X handles seen in Loop Feed (e.g. apopey vs AdamC_Pope). */
  xHandleAliases?: string[];
  /** Optional Loop topic content URL (same host/shape as Loop Feed teams). */
  loopTopicUrl?: string;
  /** e.g. transfers, club beat, broadcaster — guides the model + editors */
  editorialNote?: string;
  /** Team beat reporter vs national/generic voice. */
  affiliationScope: LoopFeedReporterAffiliationScope;
  /** Club name when affiliationScope is team (e.g. Leeds United). */
  teamName?: string;
  /** Primary outlet when known (e.g. BBC, Sky). */
  outlet?: string;
  /** Voice type for weighting in match reports and manual sources. */
  roleCategory: LoopFeedReporterRoleCategory;
  /** Lower number = higher editorial priority (1 is top). */
  priority: number;
  /** Editorial weight 1–100 — higher = stronger pull in standfirsts and colour. */
  weight: number;
  active: boolean;
  updatedAt: string;
};

export const DEFAULT_REPORTER_PRIORITY = 50;
export const DEFAULT_REPORTER_WEIGHT = 50;
export const DEFAULT_REPORTER_ROLE: LoopFeedReporterRoleCategory = "journalist";
export const DEFAULT_REPORTER_AFFILIATION: LoopFeedReporterAffiliationScope = "generic";

export type LoopFeedPriorityReportersFile = {
  reporters: LoopFeedPriorityReporterRow[];
};

export function normalizeReporterAffiliationScope(raw: unknown): LoopFeedReporterAffiliationScope {
  return raw === "team" || raw === "generic" ? raw : DEFAULT_REPORTER_AFFILIATION;
}

export function normalizeReporterTeamName(raw: unknown, scope: LoopFeedReporterAffiliationScope): string | undefined {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (scope !== "team") return undefined;
  return value || undefined;
}

export function normalizeReporterOutlet(raw: unknown): string | undefined {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value || undefined;
}

export function reporterOutletLabel(outlet: string | undefined): string | undefined {
  if (!outlet) return undefined;
  const match = LOOP_FEED_REPORTER_OUTLETS.find(
    (row) => row.id === outlet.toLowerCase() || row.label.toLowerCase() === outlet.toLowerCase(),
  );
  return match?.label ?? outlet;
}

export function inferReporterAffiliationFromLegacyNote(
  editorialNote: string | undefined,
): Pick<LoopFeedPriorityReporterRow, "affiliationScope" | "teamName" | "outlet"> {
  const note = editorialNote?.trim() ?? "";
  if (!note) {
    return { affiliationScope: DEFAULT_REPORTER_AFFILIATION };
  }

  const lower = note.toLowerCase();
  const outlet = inferReporterOutlet({ name: "", editorialNote: note, xHandle: undefined });
  const outletValue =
    outlet === "BBC"
      ? "BBC"
      : outlet === "Sky"
        ? "Sky"
        : outlet === "Athletic"
          ? "The Athletic"
          : undefined;

  if (/multi-club|tier-one breaks|tier-one transfers|national|generic|broadcaster/.test(lower)) {
    return { affiliationScope: "generic", outlet: outletValue };
  }

  const clubMatch =
    note.match(/(?:Club correspondent|correspondent)\s*·\s*([^·]+)/i) ??
    note.match(/·\s*([A-Z][^·]+?(?:United|City|Albion|Wanderers|Hotspur|Forest|Palace|Town|County|Rovers|Athletic|FC)?)\s*$/i) ??
    note.match(/·\s*([A-Z][^·]+)$/);

  const teamName = clubMatch?.[1]?.trim();
  if (teamName && !/multi-club|tier-one/i.test(teamName)) {
    return { affiliationScope: "team", teamName, outlet: outletValue };
  }

  return { affiliationScope: DEFAULT_REPORTER_AFFILIATION, outlet: outletValue };
}

export function formatReporterAffiliationBadge(
  reporter: Pick<LoopFeedPriorityReporterRow, "affiliationScope" | "teamName" | "outlet">,
): string | null {
  const outlet = reporterOutletLabel(reporter.outlet);
  if (reporter.affiliationScope === "team" && reporter.teamName?.trim()) {
    return outlet ? `${outlet} · ${reporter.teamName.trim()}` : reporter.teamName.trim();
  }
  return outlet ?? "Generic";
}

export function normalizeReporterHandle(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  return t.replace(/^@+/, "").replace(/\s+/g, "") || undefined;
}

export function normalizeReporterHandleList(
  primary: string | undefined,
  aliases: unknown,
): { xHandle?: string; xHandleAliases?: string[] } {
  const main = normalizeReporterHandle(primary);
  const extra = Array.isArray(aliases)
    ? aliases
        .map((row) => normalizeReporterHandle(typeof row === "string" ? row : undefined))
        .filter((row): row is string => Boolean(row))
    : [];
  const uniqueAliases = [...new Set(extra.filter((row) => row !== main))];
  return {
    xHandle: main,
    xHandleAliases: uniqueAliases.length > 0 ? uniqueAliases : undefined,
  };
}

export function reporterHandleKeys(
  reporter: Pick<LoopFeedPriorityReporterRow, "xHandle" | "xHandleAliases">,
): string[] {
  const handles = normalizeReporterHandleList(reporter.xHandle, reporter.xHandleAliases);
  return [handles.xHandle, ...(handles.xHandleAliases ?? [])]
    .filter((row): row is string => Boolean(row))
    .map((row) => row.toLowerCase());
}

export function normalizeReporterPriority(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_REPORTER_PRIORITY;
  return Math.min(100, Math.max(1, Math.round(n)));
}

export function normalizeReporterWeight(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_REPORTER_WEIGHT;
  return Math.min(100, Math.max(1, Math.round(n)));
}

export function normalizeReporterRoleCategory(raw: unknown): LoopFeedReporterRoleCategory {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (LOOP_FEED_REPORTER_ROLE_CATEGORIES.some((row) => row.id === id)) {
    return id as LoopFeedReporterRoleCategory;
  }
  return DEFAULT_REPORTER_ROLE;
}

export function reporterRoleLabel(role: LoopFeedReporterRoleCategory): string {
  return LOOP_FEED_REPORTER_ROLE_CATEGORIES.find((row) => row.id === role)?.label ?? "Journalist";
}

export function inferReporterOutlet(
  reporter: Pick<LoopFeedPriorityReporterRow, "name" | "editorialNote" | "xHandle" | "outlet">,
): "BBC" | "Sky" | "Athletic" | "Quotes" | "Blog" | "URL" | "Notes" {
  const explicit = reporterOutletLabel(reporter.outlet);
  if (explicit === "BBC") return "BBC";
  if (explicit === "Sky") return "Sky";
  if (explicit === "The Athletic") return "Athletic";
  if (explicit === "Blog / independent") return "Blog";
  const hay = `${reporter.name} ${reporter.editorialNote ?? ""} ${reporter.xHandle ?? ""}`.toLowerCase();
  if (/\bbbc\b|bbcsport/.test(hay)) return "BBC";
  if (/\bsky\b|skysports|sky sports/.test(hay)) return "Sky";
  if (/the athletic|\bathletic\b/.test(hay)) return "Athletic";
  if (/blog|substack|medium/.test(hay)) return "Blog";
  if (/correspondent|journalist|reporter|beat|breaks|broadcaster/.test(hay)) return "Athletic";
  return "Notes";
}

export function inferManualSourceTypeFromReporterRole(
  role: LoopFeedReporterRoleCategory,
): ManualSourceType {
  switch (role) {
    case "journalist":
    case "reporter":
    case "broadcaster":
    case "commentator":
      return "Journalist opinion";
    case "influencer":
    case "social_media":
      return "Other";
    default:
      return "Journalist opinion";
  }
}

export function compareReporterEditorialRank(
  a: Pick<LoopFeedPriorityReporterRow, "priority" | "weight" | "name">,
  b: Pick<LoopFeedPriorityReporterRow, "priority" | "weight" | "name">,
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.weight !== b.weight) return b.weight - a.weight;
  return a.name.localeCompare(b.name);
}

export function formatReporterRankBadge(reporter: Pick<LoopFeedPriorityReporterRow, "priority" | "weight">): string {
  return `P${reporter.priority} · W${reporter.weight}`;
}
