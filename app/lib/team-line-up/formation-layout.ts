import type { FootballLineupStarter } from "@/types";
import { surnameFromName } from "@/app/lib/team-line-up/player-label-layout";

/** Fallback Sport365 tactical grid codes → pitch % (GK bottom, attack upward). */
const SPORT365_POS_COORDS: Record<number, { x: number; y: number }> = {
  11: { x: 50, y: 88 },
  32: { x: 18, y: 72 },
  34: { x: 38, y: 72 },
  36: { x: 62, y: 72 },
  38: { x: 82, y: 72 },
  64: { x: 38, y: 58 },
  66: { x: 62, y: 58 },
  72: { x: 32, y: 58 },
  74: { x: 50, y: 58 },
  76: { x: 68, y: 58 },
  78: { x: 82, y: 58 },
  83: { x: 22, y: 44 },
  85: { x: 50, y: 44 },
  87: { x: 78, y: 44 },
  104: { x: 38, y: 28 },
  106: { x: 62, y: 28 },
  115: { x: 50, y: 28 },
};

/** Each row is one horizontal band: [goalkeeper count, then outfield rows]. */
const FORMATION_ROWS: Record<string, number[][]> = {
  "4-3-3": [[1], [4], [3], [3]],
  "4-2-3-1": [[1], [4], [2], [3], [1]],
  "4-4-2": [[1], [4], [4], [2]],
  "3-5-2": [[1], [3], [5], [2]],
  "3-4-3": [[1], [3], [4], [3]],
  "5-3-2": [[1], [5], [3], [2]],
  "4-1-4-1": [[1], [4], [1], [4], [1]],
};

const Y_BANDS = [92, 76, 60, 44, 24];

function xForCount(count: number, index: number): number {
  if (count <= 1) return 50;
  const min = count >= 4 ? 18 : count >= 3 ? 15 : 12;
  const max = count >= 4 ? 82 : count >= 3 ? 85 : 88;
  return Math.round(min + ((max - min) / Math.max(1, count - 1)) * index);
}

/** Infer formation string from Sport365 absolute positions (1–11). */
export function inferFormationFromAbsolutePositions(positions: number[]): string {
  const ap = positions.filter((p) => p >= 1 && p <= 11).sort((a, b) => a - b);
  if (ap.length < 10) return "4-3-3";
  const def = ap.filter((p) => p >= 2 && p <= 5).length;
  const lowMid = ap.filter((p) => p >= 6 && p <= 7).length;
  const highMid = ap.filter((p) => p >= 8 && p <= 10).length;
  const fwd = ap.filter((p) => p === 11).length;
  if (def === 5) return `5-${lowMid + highMid}-${fwd}`;
  if (def === 3) return `3-${lowMid + highMid}-${fwd}`;
  if (lowMid === 1 && highMid >= 3) return `${def}-1-${highMid}-${fwd}`;
  if (lowMid === 2 && highMid === 3) return `${def}-2-3-${fwd}`;
  if (lowMid + highMid === 4 && fwd === 2) return `${def}-4-2`;
  if (lowMid + highMid === 3) return `${def}-3-${fwd}`;
  return `${def}-${lowMid + highMid}-${fwd}`;
}

export function layoutStartersFromFormation(
  formation: string,
  players: { n: number; name: string; gk?: boolean; a_pos?: number; pos?: number }[],
): FootballLineupStarter[] {
  const rows = FORMATION_ROWS[formation] ?? FORMATION_ROWS["4-3-3"]!;
  const sorted = [...players].sort((a, b) => {
    const ap = (a.a_pos ?? 99) - (b.a_pos ?? 99);
    if (ap !== 0) return ap;
    return (a.pos ?? 99) - (b.pos ?? 99);
  });

  const gk =
    sorted.find((p) => p.gk === true || p.a_pos === 1 || p.pos === 11) ??
    sorted.find((p) => p.n === 1) ??
    sorted[0];
  const outfield = sorted.filter((p) => p !== gk && p.a_pos !== 1 && p.gk !== true);

  const out: FootballLineupStarter[] = [];
  if (gk) {
    out.push({
      n: gk.n,
      name: gk.name,
      surname: surnameFromName(gk.name),
      x: 50,
      y: Y_BANDS[0]!,
      gk: true,
    });
  }

  let idx = 0;
  for (let r = 1; r < rows.length; r++) {
    for (const count of rows[r]!) {
      const y = Y_BANDS[r] ?? 50;
      for (let c = 0; c < count; c++) {
        const p = outfield[idx++];
        if (!p) continue;
        out.push({
          n: p.n,
          name: p.name,
          surname: surnameFromName(p.name),
          x: xForCount(count, c),
          y,
        });
      }
    }
  }

  return out;
}

/** Prefer formation layout; fall back to Sport365 grid codes when a_pos is missing. */
export function resolveTeamStarters(
  formation: string,
  players: { n: number; name: string; pos?: number; a_pos?: number; gk?: boolean }[],
): FootballLineupStarter[] {
  const hasLineupOrder = players.some((p) => Number(p.a_pos) > 0);
  if (hasLineupOrder) {
    return layoutStartersFromFormation(formation, players);
  }
  return layoutFromSport365Pos(
    players.map((p) => ({
      n: p.n,
      name: p.name,
      pos: Number(p.pos) || 0,
      a_pos: Number(p.a_pos) || 0,
      gk: p.gk,
    })),
  );
}

function sortByPitchReadOrder(a: FootballLineupStarter, b: FootballLineupStarter): number {
  if (a.gk && !b.gk) return -1;
  if (!a.gk && b.gk) return 1;
  const yDiff = b.y - a.y;
  if (yDiff !== 0) return yDiff;
  return a.x - b.x;
}

function hasPitchLayoutCoords(starters: FootballLineupStarter[]): boolean {
  return starters.some((s) => s.gk || s.y !== 50 || s.x !== 50);
}

function playersOnPitchRows(
  outfield: FootballLineupStarter[],
  rows: number[],
): FootballLineupStarter[] {
  const set = new Set(rows);
  return outfield.filter((s) => set.has(s.y)).sort(sortByPitchReadOrder);
}

/** Group starters into role sections for hero team sheet layouts. */
export function groupStartersForHeroSheet(
  formation: string,
  starters: FootballLineupStarter[],
): { title: string; players: FootballLineupStarter[] }[] {
  const rows = FORMATION_ROWS[formation] ?? FORMATION_ROWS["4-3-3"]!;
  const ordered = [...starters].sort((a, b) => {
    if (hasPitchLayoutCoords(starters)) return sortByPitchReadOrder(a, b);
    if (a.gk && !b.gk) return -1;
    if (!a.gk && b.gk) return 1;
    return (a.n || 99) - (b.n || 99);
  });
  const groups: { title: string; players: FootballLineupStarter[] }[] = [];
  let idx = 0;

  for (let r = 0; r < rows.length; r++) {
    const count = rows[r]!.reduce((sum, c) => sum + c, 0);
    const chunk = ordered.slice(idx, idx + count);
    idx += count;
    if (!chunk.length) continue;

    if (r === 0) {
      groups.push({ title: "Goalkeeper", players: chunk });
      continue;
    }
    if (r === 1) {
      groups.push({ title: "Defenders", players: chunk });
      continue;
    }
    if (r === rows.length - 1) {
      groups.push({ title: chunk.length === 1 ? "Forward" : "Forwards", players: chunk });
      continue;
    }

    const mid = groups.find((g) => g.title === "Midfielders");
    if (mid) mid.players.push(...chunk);
    else groups.push({ title: "Midfielders", players: chunk });
  }

  return groups;
}

/** Group starters by pitch rows for split team sheets (GK / DEF / MID / FWD). */
export function groupStartersByPitchBand(
  formation: string,
  starters: FootballLineupStarter[],
): { title: string; players: FootballLineupStarter[] }[] {
  if (!hasPitchLayoutCoords(starters)) {
    return groupStartersForHeroSheet(formation, starters);
  }

  const gkPlayers = starters.filter((s) => s.gk || s.y >= 84).sort(sortByPitchReadOrder);
  const outfield = starters.filter((s) => !s.gk && s.y < 84);
  const yBands = [...new Set(outfield.map((s) => s.y))].sort((a, b) => b - a);

  const groups: { title: string; players: FootballLineupStarter[] }[] = [];
  if (gkPlayers.length) groups.push({ title: "Goalkeeper", players: gkPlayers });

  if (yBands.length === 0) return groups;

  if (yBands.length === 1) {
    groups.push({ title: "Forwards", players: playersOnPitchRows(outfield, yBands) });
    return groups;
  }

  if (yBands.length === 2) {
    groups.push({ title: "Defenders", players: playersOnPitchRows(outfield, [yBands[0]!]) });
    groups.push({ title: "Forwards", players: playersOnPitchRows(outfield, [yBands[1]!]) });
    return groups;
  }

  const defY = yBands[0]!;
  const fwdYs = yBands.length >= 4 ? yBands.slice(2) : [yBands[yBands.length - 1]!];
  const midYs = yBands.length >= 4 ? [yBands[1]!] : yBands.slice(1, -1);

  groups.push({ title: "Defenders", players: playersOnPitchRows(outfield, [defY]) });
  const mids = playersOnPitchRows(outfield, midYs);
  if (mids.length) groups.push({ title: "Midfielders", players: mids });
  groups.push({ title: "Forwards", players: playersOnPitchRows(outfield, fwdYs) });

  return groups;
}

/** Map single-half coordinates onto full pitch — home bottom, away top. */
export function mapStartersToCombinedHalf(
  starters: FootballLineupStarter[],
  half: "home" | "away",
): FootballLineupStarter[] {
  return starters.map((s) => {
    const spread = ((92 - s.y) / 68) * 34;
    if (half === "home") {
      return { ...s, y: Math.round(88 - spread) };
    }
    return { ...s, y: Math.round(12 + spread) };
  });
}

export function layoutFromSport365Pos(
  players: { n: number; name: string; pos: number; a_pos: number; gk?: boolean }[],
): FootballLineupStarter[] {
  return players.map((p) => {
    const mapped = SPORT365_POS_COORDS[p.pos];
    const gk = p.gk === true || p.a_pos === 1 || p.pos === 11;
    return {
      n: p.n,
      name: p.name,
      surname: surnameFromName(p.name),
      x: mapped?.x ?? 50,
      y: mapped?.y ?? 50,
      gk,
    };
  });
}
