import { describe, expect, it } from "vitest";
import { inferFormationFromAbsolutePositions, layoutStartersFromFormation } from "@/app/lib/team-line-up/formation-layout";
import { resolveKitConflict, sideColorsFromKit } from "@/app/lib/team-line-up/kit-database";
import { teamLineUpExportDimensions } from "@/app/lib/team-line-up/export-dimensions";
import { buildTeamLineUpScenes, buildTeamSheetScenes } from "@/app/features/content/content-generator";
import type { TeamLineUpBundle, TeamSheetBundle } from "@/types";
import type { TeamLineUpBundle } from "@/types";

describe("team line-up formation layout", () => {
  it("infers 4-2-3-1 from absolute positions", () => {
    const ap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    expect(inferFormationFromAbsolutePositions(ap)).toBe("4-2-3-1");
  });

  it("lays out eleven starters for 4-3-3", () => {
    const players = Array.from({ length: 11 }, (_, i) => ({
      n: i + 1,
      name: `Player ${i + 1}`,
      gk: i === 0,
      a_pos: i + 1,
    }));
    const starters = layoutStartersFromFormation("4-3-3", players);
    expect(starters).toHaveLength(11);
    expect(starters[0]?.gk).toBe(true);
    const coords = new Set(starters.map((s) => `${s.x},${s.y}`));
    expect(coords.size).toBeGreaterThan(8);
  });

  it("lays out Brazil 4-2-3-1 from Sport365 a_pos order without stacking", () => {
    const players = [
      { n: 1, name: "Alisson Becker", a_pos: 1, pos: 11 },
      { n: 24, name: "Roger Ibanez", a_pos: 2, pos: 32 },
      { n: 4, name: "Marquinhos", a_pos: 3, pos: 34 },
      { n: 3, name: "Gabriel", a_pos: 4, pos: 36 },
      { n: 16, name: "Douglas Santos", a_pos: 5, pos: 38 },
      { n: 20, name: "Lucas Paqueta", a_pos: 6, pos: 72 },
      { n: 8, name: "Bruno Guimaraes", a_pos: 7, pos: 74 },
      { n: 5, name: "Casemiro", a_pos: 8, pos: 76 },
      { n: 11, name: "Raphinha", a_pos: 9, pos: 78 },
      { n: 25, name: "Igor Thiago", a_pos: 10, pos: 104 },
      { n: 7, name: "Vinicius Junior", a_pos: 11, pos: 106 },
    ];
    const starters = layoutStartersFromFormation("4-2-3-1", players);
    expect(starters).toHaveLength(11);
    const stacked = starters.filter((s) => s.x === 50 && s.y === 50);
    expect(stacked).toHaveLength(0);
    expect(starters.find((s) => s.surname === "Vinicius Jr")?.y).toBeLessThan(40);
  });
});

describe("kit conflict engine", () => {
  it("keeps Brazil home and Morocco away when they play", () => {
    const { homeSlot, awaySlot } = resolveKitConflict("Brazil", "Morocco", { competition: "World Cup" });
    expect(homeSlot).toBe("home");
    expect(awaySlot).toBe("away");
  });

  it("switches Liverpool away kit when clashing with Man United home red", () => {
    const { homeSlot, awaySlot } = resolveKitConflict("Manchester United", "Liverpool", {
      competition: "Premier League",
    });
    expect(homeSlot).toBe("home");
    expect(awaySlot).toBe("away");
    const away = sideColorsFromKit("Liverpool", awaySlot, { competition: "Premier League" });
    expect(away.shirtColor.toUpperCase()).toBe("#111827");
  });

  it("unknown team gets neutral grey not Brazil yellow", () => {
    const colors = sideColorsFromKit("Unknown FC", "home");
    expect(colors.shirtColor.toUpperCase()).toBe("#6B7280");
    expect(colors.shirtColor.toUpperCase()).not.toBe("#FFDF00");
  });
});

describe("team sheet content generator", () => {
  const base: TeamSheetBundle = {
    id: "tpl-sheet",
    league: "Premier League",
    matchDate: "1 Jan 2026",
    kickoff: "15:00",
    brandStyle: "sport365",
    sheetVariant: "standard",
    teamView: "home",
    lineupStatus: "confirmed",
    exportAspect: "portrait",
    homeKitSlot: "home",
    awayKitSlot: "away",
    home: {
      name: "Liverpool",
      formation: "4-3-3",
      shirtColor: "#C8102E",
      numberColor: "#fff",
      starters: layoutStartersFromFormation(
        "4-3-3",
        Array.from({ length: 11 }, (_, i) => ({ n: i + 1, name: `L${i + 1}`, gk: i === 0 })),
      ),
    },
    away: {
      name: "Burnley",
      formation: "4-4-2",
      shirtColor: "#6C1D45",
      numberColor: "#fff",
      starters: layoutStartersFromFormation(
        "4-4-2",
        Array.from({ length: 11 }, (_, i) => ({ n: i + 1, name: `B${i + 1}`, gk: i === 0 })),
      ),
    },
    bench: {
      home: [{ n: 12, name: "Sub One" }],
      away: [{ n: 12, name: "Sub Two" }],
    },
    injuries: { home: [], away: [] },
  };

  it("builds team sheet scenes without intro/outro", () => {
    const scenes = buildTeamSheetScenes(base);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.templateId).toBe("team-sheet-standard");
    expect(scenes[0]?.data.subs).toHaveLength(1);
  });

  it("builds combined team sheet as single scene", () => {
    const scenes = buildTeamSheetScenes({ ...base, sheetVariant: "combined", teamView: "both" });
    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.templateId).toBe("team-sheet-combined");
    expect(scenes[0]?.data.homeSubs).toHaveLength(1);
    expect(scenes[0]?.data.awaySubs).toHaveLength(1);
  });
});

describe("team line-up content generator", () => {
  const base: TeamLineUpBundle = {
    id: "tpl-test",
    league: "Premier League",
    matchDate: "1 Jan 2026",
    kickoff: "15:00",
    brandStyle: "sport365",
    teamView: "both",
    lineupStatus: "predicted",
    exportAspect: "landscape",
    homeKitSlot: "home",
    awayKitSlot: "away",
    home: {
      name: "Liverpool",
      shortName: "LIV",
      formation: "4-3-3",
      shirtColor: "#C8102E",
      numberColor: "#fff",
      starters: layoutStartersFromFormation(
        "4-3-3",
        Array.from({ length: 11 }, (_, i) => ({ n: i + 1, name: `L${i + 1}`, gk: i === 0 })),
      ),
    },
    away: {
      name: "Burnley",
      shortName: "BUR",
      formation: "4-4-2",
      shirtColor: "#6C1D45",
      numberColor: "#fff",
      starters: layoutStartersFromFormation(
        "4-4-2",
        Array.from({ length: 11 }, (_, i) => ({ n: i + 1, name: `B${i + 1}`, gk: i === 0 })),
      ),
    },
    bench: { home: [], away: [] },
    injuries: { home: [], away: [] },
  };

  it("builds intro, home, away, combined, and outro for both teams", () => {
    const scenes = buildTeamLineUpScenes(base);
    expect(scenes).toHaveLength(5);
    expect(scenes.map((s) => s.templateId)).toEqual([
      "team-line-up-intro",
      "team-line-up-card",
      "team-line-up-card",
      "team-line-up-combined",
      "team-line-up-outro",
    ]);
    const dims = teamLineUpExportDimensions("landscape");
    expect(scenes[1]?.data.width).toBe(dims.width);
    expect(scenes[1]?.data.height).toBe(dims.height);
  });

  it("builds intro, home, and outro for home-only view", () => {
    const scenes = buildTeamLineUpScenes({ ...base, teamView: "home" });
    expect(scenes).toHaveLength(3);
    expect(scenes.map((s) => s.id)).toEqual(["intro", "lineup-home", "outro"]);
  });
});
