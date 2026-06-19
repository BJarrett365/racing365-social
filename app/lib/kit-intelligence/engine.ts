import kitsJson from "@/data/kits/kits.json";
import type {
  DerivedKitColors,
  KitConflictResult,
  KitLookupContext,
  KitPieces,
  OutfitKitSlot,
  TeamKitRecord,
} from "@/app/lib/kit-intelligence/types";

/** Neutral grey — never default to a real club/nation kit. */
export const NEUTRAL_KIT_FALLBACK: KitPieces & { goalkeeper: KitPieces } = {
  shirt: "#6B7280",
  shorts: "#4B5563",
  socks: "#6B7280",
  goalkeeper: { shirt: "#374151", shorts: "#374151", socks: "#374151" },
};

const KIT_INDEX: TeamKitRecord[] = (kitsJson as { teams: TeamKitRecord[] }).teams;

function normaliseKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function competitionKey(competition?: string): string {
  if (!competition) return "";
  const c = competition.toLowerCase();
  if (c.includes("world cup") || c.includes("wc")) return "world-cup";
  if (c.includes("premier league") || c.includes("epl")) return "premier-league";
  return normaliseKey(competition);
}

function recordMatchesTeam(record: TeamKitRecord, key: string): boolean {
  if (normaliseKey(record.teamName) === key) return true;
  if (record.teamId === key) return true;
  if (record.aliases?.some((a) => normaliseKey(a) === key)) return true;
  const idNorm = normaliseKey(record.teamId);
  if (idNorm === key || key.includes(idNorm) || idNorm.includes(key)) return true;
  return false;
}

/** Resolve a team kit record from name + optional competition/season context. */
export function lookupTeamKit(
  teamName: string,
  ctx: KitLookupContext = {},
): TeamKitRecord | null {
  const key = normaliseKey(teamName);
  if (!key) return null;

  const compKey = competitionKey(ctx.competition);
  const season = ctx.season?.trim();

  const candidates = KIT_INDEX.filter((r) => recordMatchesTeam(r, key));

  if (candidates.length === 0) {
    const fuzzy = KIT_INDEX.find((r) => {
      const tn = normaliseKey(r.teamName);
      return key.includes(tn) || tn.includes(key);
    });
    return fuzzy ?? null;
  }

  if (candidates.length === 1) return candidates[0]!;

  const scored = candidates.map((r) => {
    let score = 0;
    const rComp = competitionKey(r.competition);
    if (compKey && rComp === compKey) score += 10;
    if (season && r.season === season) score += 5;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.r;
}

export function kitPiecesForSlot(record: TeamKitRecord, slot: OutfitKitSlot): KitPieces {
  switch (slot) {
    case "away":
      return record.awayKit;
    case "third":
      return record.thirdKit;
    default:
      return record.homeKit;
  }
}

function relativeLuminance(hex: string): number {
  const x = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(x.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastNumberColor(shirt: string): string {
  return relativeLuminance(shirt) > 0.45 ? "#111827" : "#FFFFFF";
}

/** Map shirt/shorts/socks → render tokens (number, sleeve, trim, GK). */
export function deriveKitColors(pieces: KitPieces, goalkeeper: KitPieces): DerivedKitColors {
  return {
    shirt: pieces.shirt,
    shorts: pieces.shorts,
    socks: pieces.socks,
    number: contrastNumberColor(pieces.shirt),
    sleeve: pieces.shorts,
    trim: pieces.shorts,
    gkShirt: goalkeeper.shirt,
    gkShorts: goalkeeper.shorts,
    gkSocks: goalkeeper.socks,
  };
}

export function neutralFallbackColors(): DerivedKitColors {
  return deriveKitColors(
    { shirt: NEUTRAL_KIT_FALLBACK.shirt, shorts: NEUTRAL_KIT_FALLBACK.shorts, socks: NEUTRAL_KIT_FALLBACK.socks },
    NEUTRAL_KIT_FALLBACK.goalkeeper,
  );
}

/** Colours for teamName + kitType — never falls back to Brazil or any real kit. */
export function resolveKitColors(
  teamName: string,
  kitType: OutfitKitSlot,
  ctx: KitLookupContext = {},
): DerivedKitColors {
  const record = lookupTeamKit(teamName, ctx);
  if (!record) return neutralFallbackColors();
  return deriveKitColors(kitPiecesForSlot(record, kitType), record.goalkeeperKit);
}

function hexDistance(a: string, b: string): number {
  const parse = (h: string) => {
    const x = h.replace("#", "");
    return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

const CLASH_THRESHOLD = 70;

/**
 * Kit collision: home → homeKit; away → awayKit by default.
 * If away kit clashes with home shirt, switch away to thirdKit.
 */
export function resolveKitCollision(
  homeTeam: string,
  awayTeam: string,
  ctx: KitLookupContext = {},
): KitConflictResult {
  const homeRecord = lookupTeamKit(homeTeam, ctx);
  const awayRecord = lookupTeamKit(awayTeam, ctx);

  const homeSlot: OutfitKitSlot = "home";
  let awaySlot: OutfitKitSlot = "away";

  if (!homeRecord || !awayRecord) {
    return { homeSlot, awaySlot };
  }

  const homeShirt = homeRecord.homeKit.shirt;
  const awayShirt = awayRecord.awayKit.shirt;

  if (hexDistance(homeShirt, awayShirt) < CLASH_THRESHOLD) {
    awaySlot = "third";
  }

  return { homeSlot, awaySlot };
}

export function listKitTeams(): TeamKitRecord[] {
  return [...KIT_INDEX];
}

export { normaliseKey as kitNormaliseKey };
