import { describe, expect, it } from "vitest";
import {
  footballScheduleBrands,
  PLANET_SPORT_BRANDS,
  planetSportBrandOptions,
} from "./catalog";

describe("planet-sport-brands catalog", () => {
  it("contains 12 unique brands", () => {
    expect(PLANET_SPORT_BRANDS).toHaveLength(12);
    const ids = new Set(PLANET_SPORT_BRANDS.map((b) => b.id));
    expect(ids.size).toBe(12);
    const names = new Set(PLANET_SPORT_BRANDS.map((b) => b.displayName));
    expect(names.size).toBe(12);
  });

  it("returns football schedule subset", () => {
    const football = footballScheduleBrands();
    expect(football.length).toBe(5);
    expect(football.map((b) => b.displayName)).toContain("Grassroot Goals");
  });

  it("exposes select options", () => {
    const opts = planetSportBrandOptions();
    expect(opts.some((o) => o.label === "PlanetF1.com")).toBe(true);
  });
});
