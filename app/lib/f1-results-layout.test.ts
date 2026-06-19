import { describe, expect, it } from "vitest";
import {
  computeF1ResultsLayout,
  displayF1ResultsDriverName,
  formatF1DriverName,
} from "./f1-results-layout";

const ACCEPTANCE_NAMES = [
  "Carlos Sainz",
  "Esteban Ocon",
  "Sergio Perez",
  "Charles Leclerc",
  "Alexander Albon",
  "Fernando Alonso",
  "Valtteri Bottas",
  "Lance Stroll",
];

describe("f1-results-layout", () => {
  it("formats names by priority without mid-word truncation", () => {
    expect(formatF1DriverName("Lewis Hamilton", "full")).toBe("Lewis Hamilton");
    expect(formatF1DriverName("Lewis Hamilton", "initial")).toBe("L. Hamilton");
    expect(formatF1DriverName("Lewis Hamilton", "surname")).toBe("Hamilton");
  });

  it("fits acceptance names on a portrait results board", () => {
    const layout = computeF1ResultsLayout(1080, 1920, ACCEPTANCE_NAMES);
    for (const name of ACCEPTANCE_NAMES) {
      const display = displayF1ResultsDriverName(name, layout);
      expect(display).not.toMatch(/\.\.\./);
      expect(display.endsWith("...")).toBe(false);
      expect(display.includes(" S...")).toBe(false);
      expect(display.length).toBeGreaterThan(2);
      expect(display).toBe(name.toUpperCase());
    }
  });

  it("never returns ellipsis-style clipped surnames for long names", () => {
    const layout = computeF1ResultsLayout(1080, 1920, ACCEPTANCE_NAMES);
    expect(displayF1ResultsDriverName("Alexander Albon", layout)).not.toBe("ALEXANDE...");
    expect(displayF1ResultsDriverName("Fernando Alonso", layout)).not.toBe("FERNANDO A...");
  });
});
