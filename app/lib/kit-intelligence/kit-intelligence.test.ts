import { describe, expect, it } from "vitest";
import {
  NEUTRAL_KIT_FALLBACK,
  lookupTeamKit,
  neutralFallbackColors,
  resolveKitCollision,
  resolveKitColors,
} from "@/app/lib/kit-intelligence";

describe("Kit Intelligence Engine", () => {
  it("resolves Germany home as white and away as pink", () => {
    const home = resolveKitColors("Germany", "home", { competition: "World Cup", season: "2026" });
    const away = resolveKitColors("Germany", "away", { competition: "World Cup", season: "2026" });
    expect(home.shirt.toUpperCase()).toBe("#FFFFFF");
    expect(away.shirt.toUpperCase()).toBe("#F472B6");
  });

  it("resolves Brazil home yellow and away blue", () => {
    const home = resolveKitColors("Brazil", "home", { competition: "World Cup" });
    const away = resolveKitColors("Brazil", "away", { competition: "World Cup" });
    expect(home.shirt.toUpperCase()).toBe("#FFDF00");
    expect(away.shirt.toUpperCase()).toBe("#0033A0");
  });

  it("uses neutral grey for unknown teams — never Brazil yellow", () => {
    const unknown = resolveKitColors("FC Unknown Town", "home");
    expect(unknown.shirt.toUpperCase()).toBe(NEUTRAL_KIT_FALLBACK.shirt.toUpperCase());
    expect(unknown.shirt.toUpperCase()).not.toBe("#FFDF00");
  });

  it("returns null lookup for unknown team", () => {
    expect(lookupTeamKit("Totally Fake FC")).toBeNull();
  });

  it("neutral fallback is grey goalkeeper kit", () => {
    const n = neutralFallbackColors();
    expect(n.gkShirt.toUpperCase()).toBe(NEUTRAL_KIT_FALLBACK.goalkeeper.shirt.toUpperCase());
  });

  it("Brazil vs Germany — Germany wears away (pink)", () => {
    const { homeSlot, awaySlot } = resolveKitCollision("Brazil", "Germany", { competition: "World Cup" });
    expect(homeSlot).toBe("home");
    expect(awaySlot).toBe("away");
    const germany = resolveKitColors("Germany", awaySlot, { competition: "World Cup" });
    expect(germany.shirt.toUpperCase()).toBe("#F472B6");
  });

  it("England vs Germany — Germany wears away (pink)", () => {
    const { awaySlot } = resolveKitCollision("England", "Germany", { competition: "World Cup" });
    expect(awaySlot).toBe("away");
    const germany = resolveKitColors("Germany", awaySlot, { competition: "World Cup" });
    expect(germany.shirt.toUpperCase()).toBe("#F472B6");
  });

  it("Liverpool vs Burnley — Liverpool home, Burnley away", () => {
    const { homeSlot, awaySlot } = resolveKitCollision("Liverpool", "Burnley", {
      competition: "Premier League",
    });
    expect(homeSlot).toBe("home");
    expect(awaySlot).toBe("away");
  });

  it("Man United vs Liverpool — Liverpool switches to away (black)", () => {
    const { awaySlot } = resolveKitCollision("Manchester United", "Liverpool", {
      competition: "Premier League",
    });
    expect(awaySlot).toBe("away");
    const liverpool = resolveKitColors("Liverpool", awaySlot, { competition: "Premier League" });
    expect(liverpool.shirt.toUpperCase()).toBe("#111827");
  });

  it("includes dedicated goalkeeper kit colours", () => {
    const brazil = lookupTeamKit("Brazil", { competition: "World Cup" });
    expect(brazil?.goalkeeperKit.shirt.toUpperCase()).toBe("#111827");
    const colors = resolveKitColors("Brazil", "home", { competition: "World Cup" });
    expect(colors.gkShirt.toUpperCase()).toBe("#111827");
  });
});
