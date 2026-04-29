import type { RunnerSilks, SilkPattern } from "@/types";

const PALETTE = ["#1e3a8a", "#b91c1c", "#15803d", "#a16207", "#7c3aed", "#0d9488"] as const;

/** Default silks for new racecard runners (editor + empty template). */
export function defaultSilksForIndex(i: number): RunnerSilks {
  const body = PALETTE[i % PALETTE.length]!;
  const secondary = PALETTE[(i + 2) % PALETTE.length]!;
  return { body, secondary, cap: "#f8fafc", pattern: "silks_icon" };
}

export const SILK_PATTERN_OPTIONS: { value: SilkPattern; label: string }[] = [
  { value: "silks_icon", label: "Shirt & cap (placeholder)" },
  { value: "halves", label: "Halves" },
  { value: "stripes", label: "Stripes" },
  { value: "quarters", label: "Quarters" },
  { value: "solid", label: "Solid" },
  { value: "chest_disc", label: "Chest disc + bands" },
  { value: "v_chest", label: "V panel + striped cap" },
  { value: "chevron", label: "Chevrons" },
];
