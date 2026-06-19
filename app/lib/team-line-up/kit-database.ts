/**
 * Team kit resolution — thin adapter over Kit Intelligence Engine.
 * All shirt colours derive from data/kits/kits.json via teamName + kitType.
 */

import type { TeamLineUpKitSlot } from "@/types";
import {
  lookupTeamKit,
  neutralFallbackColors,
  resolveKitCollision,
  resolveKitColors,
  type KitLookupContext,
  type OutfitKitSlot,
} from "@/app/lib/kit-intelligence";

export type KitColors = {
  shirt: string;
  shorts: string;
  socks: string;
  number: string;
  sleeve: string;
  trim: string;
  gkShirt?: string;
};

export type TeamKitEntry = {
  home: KitColors;
  away: KitColors;
  third: KitColors;
};

function toLegacyKitColors(
  teamName: string,
  slot: OutfitKitSlot,
  ctx: KitLookupContext,
): KitColors {
  const c = resolveKitColors(teamName, slot, ctx);
  return {
    shirt: c.shirt,
    shorts: c.shorts,
    socks: c.socks,
    number: c.number,
    sleeve: c.sleeve,
    trim: c.trim,
    gkShirt: c.gkShirt,
  };
}

function recordToEntry(teamName: string, ctx: KitLookupContext): TeamKitEntry {
  const record = lookupTeamKit(teamName, ctx);
  if (!record) {
    const neutral = neutralFallbackColors();
    const kit: KitColors = {
      shirt: neutral.shirt,
      shorts: neutral.shorts,
      socks: neutral.socks,
      number: neutral.number,
      sleeve: neutral.sleeve,
      trim: neutral.trim,
      gkShirt: neutral.gkShirt,
    };
    return { home: kit, away: { ...kit }, third: { ...kit } };
  }
  return {
    home: toLegacyKitColors(teamName, "home", ctx),
    away: toLegacyKitColors(teamName, "away", ctx),
    third: toLegacyKitColors(teamName, "third", ctx),
  };
}

export function lookupTeamKitEntry(teamName: string, ctx: KitLookupContext = {}): TeamKitEntry {
  return recordToEntry(teamName, ctx);
}

export function kitColorsForSlot(entry: TeamKitEntry, slot: TeamLineUpKitSlot): KitColors {
  return entry[slot] ?? entry.home;
}

export function resolveKitConflict(
  homeTeam: string,
  awayTeam: string,
  ctx: KitLookupContext = {},
): {
  homeSlot: TeamLineUpKitSlot;
  awaySlot: TeamLineUpKitSlot;
} {
  return resolveKitCollision(homeTeam, awayTeam, ctx);
}

export function sideColorsFromKit(
  teamName: string,
  slot: TeamLineUpKitSlot,
  ctx: KitLookupContext = {},
): {
  shirtColor: string;
  numberColor: string;
  sleeveColor: string;
  trimColor: string;
  gkShirtColor: string;
} {
  const kit = resolveKitColors(teamName, slot, ctx);
  return {
    shirtColor: kit.shirt,
    numberColor: kit.number,
    sleeveColor: kit.sleeve,
    trimColor: kit.trim,
    gkShirtColor: kit.gkShirt,
  };
}
