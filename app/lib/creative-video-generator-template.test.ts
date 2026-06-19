import { describe, expect, it } from "vitest";
import {
  CREATIVE_VIDEO_GENERATOR_TEMPLATE,
  CREATIVE_VIDEO_GENERATOR_WORLD_CUP_FOOTBALL_TEMPLATE,
  creativeVideoGeneratorTemplateForVariant,
} from "@/app/lib/creative-video-generator-template";

describe("creative-video-generator-template", () => {
  it("keeps generic template for default variant", () => {
    expect(creativeVideoGeneratorTemplateForVariant("default")).toBe(CREATIVE_VIDEO_GENERATOR_TEMPLATE);
    expect(CREATIVE_VIDEO_GENERATOR_TEMPLATE).toContain("Horse racing crowd");
  });

  it("uses World Cup football brief for planet-football-table variant", () => {
    expect(creativeVideoGeneratorTemplateForVariant("world-cup-football")).toBe(
      CREATIVE_VIDEO_GENERATOR_WORLD_CUP_FOOTBALL_TEMPLATE,
    );
    expect(CREATIVE_VIDEO_GENERATOR_WORLD_CUP_FOOTBALL_TEMPLATE).toContain("Sport365 World Cup football table");
    expect(CREATIVE_VIDEO_GENERATOR_WORLD_CUP_FOOTBALL_TEMPLATE).not.toContain("Horse racing");
  });
});
