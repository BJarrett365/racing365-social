import { describe, expect, it } from "vitest";
import {
  groupStartersByPitchBand,
  layoutStartersFromFormation,
} from "@/app/lib/team-line-up/formation-layout";

describe("groupStartersByPitchBand", () => {
  const france433 = [
    { n: 16, name: "Mike Maignan", a_pos: 1, gk: true },
    { n: 5, name: "Jules Kounde", a_pos: 2 },
    { n: 4, name: "Dayot Upamecano", a_pos: 3 },
    { n: 17, name: "William Saliba", a_pos: 4 },
    { n: 19, name: "Theo Hernandez", a_pos: 5 },
    { n: 8, name: "Aurelien Tchouameni", a_pos: 6 },
    { n: 14, name: "Adrien Rabiot", a_pos: 7 },
    { n: 20, name: "Desire Doue", a_pos: 8 },
    { n: 7, name: "Ousmane Dembele", a_pos: 9 },
    { n: 10, name: "Kylian Mbappe", a_pos: 10 },
    { n: 11, name: "Michael Olise", a_pos: 11 },
  ];

  it("groups France 4-3-3 by pitch rows", () => {
    const starters = layoutStartersFromFormation("4-3-3", france433);
    const groups = groupStartersByPitchBand("4-3-3", starters);

    expect(groups.map((g) => g.title)).toEqual(["Goalkeeper", "Defenders", "Midfielders", "Forwards"]);
    expect(groups[0]?.players.map((p) => p.n)).toEqual([16]);
    expect(groups[1]?.players.map((p) => p.n)).toEqual([5, 4, 17, 19]);
    expect(groups[2]?.players.map((p) => p.n)).toEqual([8, 14, 20]);
    expect(groups[3]?.players.map((p) => p.n)).toEqual([7, 10, 11]);
  });

  it("merges attacking rows into forwards for 4-2-3-1", () => {
    const france4231 = layoutStartersFromFormation("4-2-3-1", france433);
    const groups = groupStartersByPitchBand("4-2-3-1", france4231);

    expect(groups.map((g) => g.title)).toEqual(["Goalkeeper", "Defenders", "Midfielders", "Forwards"]);
    expect(groups[1]?.players).toHaveLength(4);
    expect(groups[2]?.players).toHaveLength(2);
    expect(groups[3]?.players).toHaveLength(4);
  });
});
