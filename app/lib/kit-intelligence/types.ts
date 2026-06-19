/** Three-part outfield kit — shirt, shorts, socks. */
export type KitPieces = {
  shirt: string;
  shorts: string;
  socks: string;
};

export type KitSlotKey = "home" | "away" | "third" | "goalkeeper";

/** Canonical team kit record — single source of truth per team/competition/season. */
export type TeamKitRecord = {
  teamId: string;
  teamName: string;
  competition: string;
  season: string;
  homeKit: KitPieces;
  awayKit: KitPieces;
  thirdKit: KitPieces;
  goalkeeperKit: KitPieces;
  /** Alternate spellings / abbreviations for lookup (lowercase). */
  aliases?: string[];
};

export type KitLookupContext = {
  competition?: string;
  season?: string;
};

/** Render-facing colours derived from a kit slot (+ GK kit). */
export type DerivedKitColors = {
  shirt: string;
  shorts: string;
  socks: string;
  number: string;
  sleeve: string;
  trim: string;
  gkShirt: string;
  gkShorts: string;
  gkSocks: string;
};

export type OutfitKitSlot = "home" | "away" | "third";

export type KitConflictResult = {
  homeSlot: OutfitKitSlot;
  awaySlot: OutfitKitSlot;
};
