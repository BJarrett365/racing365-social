import { describe, expect, it } from "vitest";
import { resolveStarterCollisions, surnameFromName, collisionOptsForExport } from "@/app/lib/team-line-up/player-label-layout";

describe("player label layout", () => {
  it("formats Vinicius Junior as VINICIUS JR", () => {
    expect(surnameFromName("Vinicius Junior")).toBe("Vinicius Jr");
  });

  it("keeps double-barrel surnames", () => {
    expect(surnameFromName("Nico Schlotterbeck")).toBe("Schlotterbeck");
    expect(surnameFromName("Simon Bruun Larsen")).toBe("Bruun Larsen");
  });

  it("spreads colliding defenders horizontally", () => {
    const opts = collisionOptsForExport(1080, 1350);
    const starters = [
      { n: 1, name: "A", surname: "SCHLOTTERBECK", x: 37, y: 76 },
      { n: 2, name: "B", surname: "BRUUN LARSEN", x: 63, y: 76 },
    ];
    const out = resolveStarterCollisions(starters, opts);
    expect(Math.abs(out[0]!.x - out[1]!.x)).toBeGreaterThan(15);
  });

  it("keeps four-man back lines separated (Marquinhos / Gabriel)", () => {
    const opts = collisionOptsForExport(1080, 1350);
    const starters = [
      { n: 3, name: "Santos", surname: "SANTOS", x: 18, y: 76 },
      { n: 4, name: "Marquinhos", surname: "MARQUINHOS", x: 37, y: 76 },
      { n: 5, name: "Gabriel", surname: "GABRIEL", x: 63, y: 76 },
      { n: 6, name: "Ibanez", surname: "IBANEZ", x: 82, y: 76 },
    ];
    const out = resolveStarterCollisions(starters, opts).sort((a, b) => a.x - b.x);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.x - out[i - 1]!.x).toBeGreaterThan(8);
    }
    expect(out[0]!.x).toBeGreaterThanOrEqual(14);
    expect(out[out.length - 1]!.x).toBeLessThanOrEqual(86);
  });
});
