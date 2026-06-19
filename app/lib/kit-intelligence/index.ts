export type {
  DerivedKitColors,
  KitConflictResult,
  KitLookupContext,
  KitPieces,
  KitSlotKey,
  OutfitKitSlot,
  TeamKitRecord,
} from "@/app/lib/kit-intelligence/types";

export {
  NEUTRAL_KIT_FALLBACK,
  deriveKitColors,
  kitNormaliseKey,
  kitPiecesForSlot,
  listKitTeams,
  lookupTeamKit,
  neutralFallbackColors,
  resolveKitCollision,
  resolveKitColors,
} from "@/app/lib/kit-intelligence/engine";
