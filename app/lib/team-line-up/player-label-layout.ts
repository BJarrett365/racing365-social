import type { FootballLineupStarter } from "@/types";

/** Display surname — handles double-barrel and "Junior" suffixes. */
export function surnameFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  const last = parts[parts.length - 1]!.toLowerCase();
  if (last === "junior" || last === "jr" || last === "júnior") {
    return parts.length >= 2 ? `${parts[0]!} Jr` : parts[0]!;
  }
  if (parts.length >= 3) {
    const penultimate = parts[parts.length - 2]!;
    if (/^[A-ZÁÉÍÓÚÑ]/.test(penultimate) && penultimate.length > 2) {
      return `${penultimate} ${parts[parts.length - 1]!}`;
    }
  }
  return parts[parts.length - 1]!;
}

export type CollisionLayoutOpts = {
  /** Minimum gap between label edges in pixels. */
  minGapPx?: number;
  /** Horizontal inset from stage edges (%). */
  edgePadPct?: number;
  /** Render stage width in pixels (for label width estimates). */
  stageWidthPx?: number;
  /** Name font size in pixels. */
  namePx?: number;
  /** Shirt icon width in pixels. */
  shirtPx?: number;
};

/** Match render pipeline sizing for stored scene payloads. */
export function collisionOptsForExport(w: number, h: number): Required<CollisionLayoutOpts> {
  const portrait = h > w;
  const shirtPx = portrait
    ? Math.min(90, Math.max(70, Math.round(w * 0.078)))
    : Math.min(72, Math.max(56, Math.round(w * 0.042)));
  const namePx = portrait
    ? Math.min(34, Math.max(26, Math.round(w * 0.028)))
    : Math.min(28, Math.max(20, Math.round(w * 0.014)));
  const stageWidthPx = Math.round(w * (portrait ? 0.94 : 0.88));
  return { minGapPx: 20, edgePadPct: 14, stageWidthPx, namePx, shirtPx };
}

function displayLabel(s: FootballLineupStarter): string {
  return (s.surname ?? surnameFromName(s.name)).toUpperCase();
}

/** Half-width of rendered label + shirt in stage % coordinates. */
function halfWidthPct(label: string, stageWidthPx: number, namePx: number, shirtPx: number): number {
  const labelPx = Math.max(shirtPx * 0.95, label.length * namePx * 0.58 + 14);
  return (labelPx / 2 / stageWidthPx) * 100;
}

/** Pack a single row so labels never overlap and stay inside the pitch. */
function layoutRow(
  row: FootballLineupStarter[],
  opts: Required<CollisionLayoutOpts>,
): FootballLineupStarter[] {
  const sorted = [...row].sort((a, b) => a.x - b.x);
  if (sorted.length <= 1) return sorted;

  const labels = sorted.map((s) => displayLabel(s));
  const half = labels.map((label) => halfWidthPct(label, opts.stageWidthPx, opts.namePx, opts.shirtPx));
  const minGapPct = (opts.minGapPx / opts.stageWidthPx) * 100;
  const leftBound = opts.edgePadPct;
  const rightBound = 100 - opts.edgePadPct;
  const span = rightBound - leftBound;

  const minCenters: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    minCenters[i] = leftBound + half[i]!;
  }
  for (let i = 1; i < sorted.length; i++) {
    const need = half[i - 1]! + half[i]! + minGapPct;
    minCenters[i] = Math.max(minCenters[i]!, minCenters[i - 1]! + need);
  }

  const maxCenter = rightBound - half[sorted.length - 1]!;
  if (minCenters[sorted.length - 1]! > maxCenter) {
    const overflow = minCenters[sorted.length - 1]! - maxCenter;
    for (let i = 0; i < minCenters.length; i++) {
      minCenters[i] = Math.max(leftBound + half[i]!, minCenters[i]! - overflow);
    }
  }

  const centers = [...minCenters];
  for (let i = sorted.length - 2; i >= 0; i--) {
    const need = half[i]! + half[i + 1]! + minGapPct;
    centers[i] = Math.min(centers[i]!, centers[i + 1]! - need);
    centers[i] = Math.max(leftBound + half[i]!, centers[i]!);
  }

  const totalNeed =
    centers.reduce((acc, c, i) => acc + (i === 0 ? 0 : c - centers[i - 1]!), 0) +
    half[0]! +
    half[sorted.length - 1]!;
  if (totalNeed < span && sorted.length >= 3) {
    const slack = span - (centers[centers.length - 1]! + half[sorted.length - 1]! - (centers[0]! - half[0]!));
    if (slack > 0) {
      const shift = Math.min(slack / 2, 4);
      for (let i = 0; i < centers.length; i++) {
        if (centers[i]! - half[i]! >= leftBound + shift * 0.2) {
          centers[i] = centers[i]! + shift * (i / Math.max(1, centers.length - 1) - 0.5) * 0.15;
        }
      }
    }
  }

  return sorted.map((s, i) => ({
    ...s,
    x: Math.round(Math.min(rightBound - half[i]!, Math.max(leftBound + half[i]!, centers[i]!)) * 10) / 10,
  }));
}

/** Resolve horizontal collisions within formation rows for readable labels. */
export function resolveStarterCollisions(
  starters: FootballLineupStarter[],
  opts: CollisionLayoutOpts = {},
): FootballLineupStarter[] {
  const resolved: Required<CollisionLayoutOpts> = {
    minGapPx: opts.minGapPx ?? 20,
    edgePadPct: opts.edgePadPct ?? 14,
    stageWidthPx: opts.stageWidthPx ?? 1015,
    namePx: opts.namePx ?? 28,
    shirtPx: opts.shirtPx ?? 84,
  };

  const rowTolerance = 6;
  const rows = new Map<number, FootballLineupStarter[]>();

  for (const s of starters) {
    const rowKey = Math.round(s.y / rowTolerance) * rowTolerance;
    const bucket = rows.get(rowKey) ?? [];
    bucket.push({ ...s });
    rows.set(rowKey, bucket);
  }

  const out: FootballLineupStarter[] = [];
  for (const row of rows.values()) {
    out.push(...layoutRow(row, resolved));
  }

  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
