import {
  BRAND_FOLLOW,
  BRAND_HORSE_RACING_FOLLOW,
  BRAND_HORSE_RACING_FULL_RESULTS,
  BRAND_HORSE_RACING_MARK,
} from "@/app/lib/brand";
import {
  RACING_EDITOR_DEFAULT_VOICE_GENDER,
  RACING_EDITOR_DEFAULT_VOICE_SPEED,
} from "@/app/lib/racing-voice-defaults";
import { silksAreRenderable } from "@/app/features/render/silk-render-shared";
import type {
  ContentFormat,
  F1GridBundle,
  F1ResultsBundle,
  FastResultBundle,
  FootballLineupBundle,
  FootballLineupSide,
  GeneratedContent,
  NextOffBundle,
  PlanetFootballTableBundle,
  PlanetRugbyTableBundle,
  PlanetRugbyTableDisplayMode,
  PlanetRugbyTableColumnKey,
  PlanetRugbyTableRow,
  NextOffSceneAnimations,
  RacecardSnapshot,
  Result,
  RunnerSilks,
  SceneSpec,
  ScoreLineBundle,
  TeamSheetBundle,
  TeamtalkNewsBundle,
  TeamLineUpBundle,
  TemplateSource,
  Tip,
} from "@/types";
import { buildTeamLineUpAiCaption } from "@/app/lib/match-report/parse-sport365-lineups";
import { pickDefaultHeroPlayer } from "@/app/features/render/team-sheet-templates";
import { buildScoreLineCaption } from "@/app/lib/score-line/build-bundle";
import { teamLineUpBrand } from "@/app/lib/team-line-up/brand-styles";
import { teamLineUpExportDimensions } from "@/app/lib/team-line-up/export-dimensions";
import { mapStartersToCombinedHalf } from "@/app/lib/team-line-up/formation-layout";
import { resolveStarterCollisions, collisionOptsForExport } from "@/app/lib/team-line-up/player-label-layout";
import {
  normalizePlanetFootballDisplayBrand,
  planetFootballBrandDefaults,
} from "@/app/lib/planet-football-table-brands";

const SHORTS_W = 1080;
const SHORTS_H = 1920;
export const SOCIAL_W = 1080;
export const SOCIAL_H = 1350;

export function buildNextOffCaption(bundle: NextOffBundle, top: Tip[]): string {
  const [a, b, c] = top;
  const race = bundle.race;
  if (!a) return `Next up at ${race.course}.`;
  const bits = [a.horse, b?.horse, c?.horse].filter(Boolean).join(", ");
  return `Next up at ${race.course}. ${a.horse} is the one to beat at ${a.odds}. Watch ${bits} in the ${race.raceTime}.`;
}

export function buildFastResultsCaption(result: FastResultBundle["result"]): string {
  const { race, winner, sp, placings } = result;
  const p2 = placings.find((p) => p.position === 2);
  const p3 = placings.find((p) => p.position === 3);
  const tail = [p2, p3]
    .filter(Boolean)
    .map((p) => `${p!.horse} ${p!.position}${p!.position === 2 ? "nd" : "rd"} at ${p!.sp}`)
    .join(". ");
  return `${winner} wins at ${sp} in the ${race.raceTime} at ${race.course}. ${tail}.`;
}

export function buildRacecardCaption(snap: RacecardSnapshot): string {
  const top = snap.topPicks.slice(0, 3).join(", ");
  const mover = snap.marketMover
    ? ` Market mover: ${snap.marketMover.horse} now ${snap.marketMover.odds}.`
    : "";
  const field = `${snap.runners.length} runners declared`;
  return `${snap.race.course} ${snap.race.raceTime} — ${snap.race.title}. ${field}. Top picks: ${top}.${mover}`;
}

export function buildNextOffScript(bundle: NextOffBundle, tips: Tip[]): string {
  const t = tips.slice(0, 3);
  return [
    `Next off at ${bundle.race.course}, the ${bundle.race.raceTime}.`,
    t[0] ? `We're siding with ${t[0].horse} at ${t[0].odds}.` : "",
    t[1] ? `${t[1].horse} next at ${t[1].odds}.` : "",
    t[2] ? `And keep ${t[2].horse} on side at ${t[2].odds}.` : "",
    `${BRAND_HORSE_RACING_FOLLOW} for more.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildFastResultsScript(result: FastResultBundle["result"]): string {
  const lines = result.placings
    .slice(0, 4)
    .map((p) =>
      p.position === 1
        ? `${p.horse} wins at ${p.sp}.`
        : `${p.horse} ${p.position === 2 ? "second" : p.position === 3 ? "third" : "fourth"} at ${p.sp}.`,
    );
  return [`Fast results ${result.race.course} ${result.race.raceTime}.`, ...lines].join(" ");
}

/** Voiceover script built from Template data — Racecard (course, field, picks, mover, notes). */
export function buildRacecardScript(snap: RacecardSnapshot): string {
  const race = snap.race;
  const sorted = [...snap.runners].sort((a, b) => a.number - b.number);
  const parts: string[] = [];

  const head = [race.course, race.raceTime, race.title].filter(Boolean).join(", ");
  if (head) parts.push(`Here's the racecard for ${head}.`);
  if (race.raceDate?.trim()) parts.push(`Race date ${race.raceDate.trim()}.`);
  if (race.distance?.trim()) parts.push(`Distance ${race.distance.trim()}.`);
  if (race.going?.trim()) parts.push(`Going ${race.going.trim()}.`);
  const declared = race.runnersCount > 0 ? race.runnersCount : sorted.length;
  if (declared > 0) parts.push(`${declared} runners declared for this race.`);

  const pickLines = snap.topPicks
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((name) => {
      const row = sorted.find((r) => r.horse.trim() === name);
      if (!row) return name;
      const odds = row.odds?.trim() && row.odds !== "—" ? ` at ${row.odds.trim()}` : "";
      const j = row.jockey?.trim() ? `, ${row.jockey.trim()} rides` : "";
      return `${name}${odds}${j}`;
    });
  if (pickLines.length) parts.push(`Top picks: ${pickLines.join(". ")}.`);

  if (snap.marketMover?.horse?.trim()) {
    const mm = snap.marketMover;
    const bits = [`Market mover: ${mm.horse.trim()}`];
    if (mm.odds?.trim() && mm.odds !== "—") bits.push(`now around ${mm.odds.trim()}`);
    if (mm.movementText?.trim()) bits.push(mm.movementText.trim());
    parts.push(`${bits.join(", ")}.`);
  }

  if (snap.nonRunners?.length) {
    const nr = snap.nonRunners
      .slice(0, 12)
      .map((n) => `${n.number} ${n.horse}${n.status ? ` (${n.status})` : ""}`)
      .join("; ");
    parts.push(`Scratches and non-runners: ${nr}${snap.nonRunners.length > 12 ? "; and others" : ""}.`);
  }

  if (sorted.length) {
    const field = sorted.map((r) => {
      const bits = [`number ${r.number}`, r.horse.trim() || "Unnamed"];
      if (r.odds?.trim() && r.odds !== "—") bits.push(`at ${r.odds.trim()}`);
      if (r.jockey?.trim()) bits.push(`jockey ${r.jockey.trim()}`);
      if (r.trainer?.trim()) bits.push(`trainer ${r.trainer.trim()}`);
      if (typeof r.draw === "number" && Number.isFinite(r.draw)) bits.push(`draw ${r.draw}`);
      return bits.join(", ");
    });
    const chunk = 5;
    for (let i = 0; i < field.length; i += chunk) {
      const slice = field.slice(i, i + chunk).join(". ");
      parts.push(i === 0 ? `The field: ${slice}.` : `Also declared: ${slice}.`);
    }
  }

  if (snap.eachWayPlaces != null && snap.eachWayPlaces > 0) {
    parts.push(`Each-way: ${snap.eachWayPlaces} places on offer.`);
  }
  if (snap.footerNote?.trim()) parts.push(snap.footerNote.trim());

  parts.push(BRAND_HORSE_RACING_FOLLOW);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function scene(
  id: string,
  templateId: string,
  durationSec: number,
  captionLine: string,
  data: Record<string, unknown>,
): SceneSpec {
  return { id, templateId, durationSec, captionLine, data };
}

/** Match winner name to a placing row, else fall back to position 1 (for PNG + list UIs). */
export function winnerSilksFromResult(result: Result): RunnerSilks | undefined {
  const placings = result.placings ?? [];
  const named = placings.find((p) => p.horse.trim() && p.horse === result.winner);
  if (named?.silks && silksAreRenderable(named.silks)) return named.silks;
  const first = placings.find((p) => p.position === 1);
  if (first?.silks && silksAreRenderable(first.silks)) return first.silks;
  return undefined;
}

/** Suggested rows per page when the editor sets pagination explicitly (omit `boardRunnersPerPage` to fit the full field on Board 1, up to 40). */
export const DEFAULT_RACECARD_BOARD_PAGE = 11;

function chunkRunners<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function boardFooterLine(snap: RacecardSnapshot): string | undefined {
  if (snap.footerNote?.trim()) return snap.footerNote.trim();
  if (snap.eachWayPlaces != null && snap.eachWayPlaces > 0) {
    return `EACH WAY ${snap.eachWayPlaces} PLACES`;
  }
  return undefined;
}

export function buildNextOffScenes(bundle: NextOffBundle, tips: Tip[]): SceneSpec[] {
  const t = tips.slice(0, 3);
  const race = bundle.race;
  const introKicker = bundle.introKicker?.trim() || "Next off";
  const outroKicker = bundle.outroKicker?.trim() || BRAND_HORSE_RACING_MARK;
  const sa = bundle.sceneAnimations;
  const tipKeys: (keyof NextOffSceneAnimations)[] = ["tip1", "tip2", "tip3"];
  return [
    scene("intro", "next-off-intro", 2.2, `${introKicker} ${race.course}`, {
      course: race.course,
      raceTime: race.raceTime,
      title: race.title,
      introKicker,
      distance: race.distance,
      going: race.going,
      runnersCount: race.runnersCount,
      animIntro: sa?.intro,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
    ...t.map((tip, i) => {
      const tipKicker = tip.kicker?.trim() || `Tip ${i + 1}`;
      const tipKey = tipKeys[i];
      return scene(`tip-${i + 1}`, "next-off-tip", 2.8, `${tip.horse} ${tip.odds}`, {
        index: i + 1,
        tipKicker,
        horse: tip.horse,
        odds: tip.odds,
        stars: tip.stars,
        silks: tip.silks,
        course: race.course,
        animTip: tipKey ? sa?.[tipKey] : undefined,
        width: SHORTS_W,
        height: SHORTS_H,
      });
    }),
    scene("outro", "next-off-outro", 2, BRAND_HORSE_RACING_MARK, {
      course: race.course,
      cta: bundle.outroCta?.trim() || "Follow for more tips",
      outroKicker,
      animOutro: sa?.outro,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
  ];
}

function teamtalkHeadlinePreview(lines: string[]): string {
  const L = lines.map((l) => l.trim()).filter(Boolean);
  return L[0] ?? "TEAMtalk News";
}

export function buildTeamtalkNewsCaption(b: TeamtalkNewsBundle): string {
  const h = teamtalkHeadlinePreview(b.headlineLines);
  return `${b.tag}: ${h}. ${b.playerName ?? ""}. ${b.linkCta}`.replace(/\s+/g, " ").trim();
}

export function buildTeamtalkNewsScript(b: TeamtalkNewsBundle): string {
  const lines = b.headlineLines.map((l) => l.trim()).filter(Boolean);
  const headline = lines.join(". ");
  const mid = (b.secondaryParagraph ?? "").trim();
  const name = (b.playerName ?? "").trim();
  const hook = `${b.tag}. ${headline}${name ? `. ${name}` : ""}.`;
  const body = mid ? ` ${mid}` : "";
  const out = (b.outroLine ?? "Follow TEAMtalk for more.").trim();
  return `${hook}${body} ${b.linkCta}. ${out}`.replace(/\s+/g, " ").trim();
}

export function buildTeamtalkNewsScenes(b: TeamtalkNewsBundle): SceneSpec[] {
  const lines = b.headlineLines.map((l) => l.trim()).filter(Boolean);
  const base = {
    tag: b.tag,
    headlineLines: lines,
    playerImageUrl: b.playerImageUrl ?? "",
    leftClubLogoUrl: b.leftClubLogoUrl ?? "",
    rightClubLogoUrl: b.rightClubLogoUrl ?? "",
    playerName: b.playerName ?? "",
    secondaryParagraph: b.secondaryParagraph ?? "",
    linkCta: b.linkCta,
    outroLine: b.outroLine ?? "",
    width: SHORTS_W,
    height: SHORTS_H,
  };
  return [
    scene("intro", "teamtalk-intro", 2.5, `${b.tag} — ${teamtalkHeadlinePreview(lines)}`, {
      ...base,
      hookLine: teamtalkHeadlinePreview(lines),
    }),
    scene("winner", "teamtalk-main", 5.5, headlineSpeechLine(lines, b.playerName), {
      ...base,
    }),
    scene("placings", "teamtalk-detail", 6, (b.secondaryParagraph ?? "").slice(0, 80) || "The story", {
      ...base,
    }),
    scene("outro", "teamtalk-outro", 4, b.linkCta, {
      ...base,
    }),
  ];
}

function headlineSpeechLine(lines: string[], playerName?: string): string {
  const L = lines.filter(Boolean);
  const bits = [...L];
  const n = (playerName ?? "").trim();
  if (n) bits.push(n);
  return bits.join(". ") || "TEAMtalk News";
}

export function buildFastResultsScenes(bundle: FastResultBundle): SceneSpec[] {
  const result = bundle.result;
  const sa = bundle.sceneAnimations;
  const race = result.race;
  const top4 = result.placings.slice(0, 4);
  return [
    scene("intro", "fast-intro", 2, `Results ${race.course}`, {
      course: race.course,
      raceTime: race.raceTime,
      title: race.title,
      raceDate: race.raceDate,
      animIntro: sa?.intro,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
    scene("winner", "fast-winner", 2.8, `${result.winner} wins`, {
      winner: result.winner,
      sp: result.sp,
      winnerSilks: winnerSilksFromResult(result),
      course: race.course,
      animWinner: sa?.winner,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
    scene("placings", "fast-placings", 3.2, top4.map((p) => `${p.position}. ${p.horse}`).join(" · ") || "Top four", {
      placings: top4,
      course: race.course,
      animPlacings: sa?.placings,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
    scene("outro", "fast-outro", 2, BRAND_HORSE_RACING_MARK, {
      cta: result.outroCta?.trim() || BRAND_HORSE_RACING_FULL_RESULTS,
      animOutro: sa?.outro,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
  ];
}

export function buildRacecardScenes(snap: RacecardSnapshot): SceneSpec[] {
  const sa = snap.sceneAnimations;
  const race = snap.race;
  const runners = [...snap.runners].sort((a, b) => a.number - b.number);
  /** Explicit `boardRunnersPerPage` paginates; otherwise fit the field on Board 1 (cap 40 rows per frame). */
  const pageSize =
    snap.boardRunnersPerPage != null && snap.boardRunnersPerPage > 0
      ? Math.max(6, Math.min(40, snap.boardRunnersPerPage))
      : Math.min(Math.max(runners.length, 1), 40);
  const pages = chunkRunners(runners, pageSize);
  const footerLine = boardFooterLine(snap);

  const scenes: SceneSpec[] = [];
  scenes.push(
    scene("intro", "rc-intro", 2.1, `${race.course} racecard`, {
      course: race.course,
      raceTime: race.raceTime,
      raceDate: race.raceDate,
      title: race.title,
      runnersCount: race.runnersCount,
      animIntro: sa?.intro,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
  );

  const boardPages = pages.length > 0 ? pages : [[] as typeof runners];
  boardPages.forEach((slice, i) => {
    const isLast = i === boardPages.length - 1;
    const totalPages = boardPages.length;
    scenes.push(
      scene(
        `board-${i + 1}`,
        "rc-board-grid",
        isLast && totalPages === 1 ? 4 : 3.4,
        `Racecard ${i + 1} of ${totalPages}`,
        {
          course: race.course,
          raceTime: race.raceTime,
          title: race.title,
          courseImageUrl: race.courseImageUrl,
          raceDate: race.raceDate,
          runners: slice,
          pageIndex: i + 1,
          pageCount: totalPages,
          topPicks: snap.topPicks,
          footerNote: isLast ? footerLine : undefined,
          animBoard: sa?.board,
          width: SHORTS_W,
          height: SHORTS_H,
        },
      ),
    );
  });

  if (snap.marketMover) {
    const m = snap.marketMover;
    scenes.push(
      scene("mover", "rc-mover", 2.8, "Market mover", {
        runner: {
          ...m,
          movement: m.movement ?? "steady",
          movementText: m.movementText ?? "",
        },
        animMover: sa?.mover,
        width: SHORTS_W,
        height: SHORTS_H,
      }),
    );
  }

  scenes.push(
    scene("cta", "rc-cta", 2.2, BRAND_HORSE_RACING_MARK, {
      cta: footerLine ?? "Odds subject to change — 18+",
      course: race.course,
      animCta: sa?.cta,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
  );

  return scenes;
}

/** Single-frame social card data (1080×1350) for static posts */
export function buildNextOffVisualData(bundle: NextOffBundle, tips: Tip[]) {
  const r = bundle.race;
  return {
    templateId: "social-next-off",
    data: {
      course: r.course,
      raceTime: r.raceTime,
      title: r.title,
      distance: r.distance,
      going: r.going,
      runnersCount: r.runnersCount,
      tips: tips.slice(0, 3),
      width: SOCIAL_W,
      height: SOCIAL_H,
    },
  };
}

export function buildFastResultsVisualData(result: FastResultBundle["result"]) {
  return {
    templateId: "social-fast-results",
    data: {
      course: result.race.course,
      raceTime: result.race.raceTime,
      winner: result.winner,
      sp: result.sp,
      winnerSilks: winnerSilksFromResult(result),
      placings: result.placings.slice(0, 4),
      width: SOCIAL_W,
      height: SOCIAL_H,
    },
  };
}

export function buildRacecardVisualData(snap: RacecardSnapshot) {
  const runners = [...snap.runners].sort((a, b) => a.number - b.number);
  return {
    templateId: "social-racecard",
    data: {
      race: snap.race,
      runners,
      topPicks: snap.topPicks,
      mover: snap.marketMover,
      footerNote: boardFooterLine(snap),
      layout: "full-board" as const,
      width: SOCIAL_W,
      height: SOCIAL_H,
    },
  };
}

export function buildMarketMoverVisualData(snap: RacecardSnapshot) {
  if (!snap.marketMover) return null;
  return {
    templateId: "social-market-mover",
    data: {
      runner: snap.marketMover,
      race: snap.race,
      width: SOCIAL_W,
      height: SOCIAL_H,
    },
  };
}

export function generateFromNextOff(bundle: NextOffBundle): GeneratedContent {
  const tips = bundle.tips.slice(0, 3);
  let scenes = buildNextOffScenes(bundle, tips);
  const edits = bundle.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec)
          ? { durationSec: ed.durationSec }
          : {}),
      };
    });
  }
  return {
    format: "next-off",
    headline: `${bundle.race.course} ${bundle.race.raceTime} — ${bundle.race.title}`,
    caption: buildNextOffCaption(bundle, tips),
    script: bundle.script !== undefined ? bundle.script : buildNextOffScript(bundle, tips),
    scenes,
    oddsHighlight: tips[0]?.odds,
    cta: BRAND_HORSE_RACING_FOLLOW,
    voiceGender: bundle.voiceGender ?? RACING_EDITOR_DEFAULT_VOICE_GENDER,
    voiceSpeed: bundle.voiceSpeed ?? RACING_EDITOR_DEFAULT_VOICE_SPEED,
  };
}

export function generateFromFastResult(bundle: FastResultBundle): GeneratedContent {
  const r = bundle.result;
  let scenes = buildFastResultsScenes(bundle);
  const edits = bundle.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec)
          ? { durationSec: ed.durationSec }
          : {}),
      };
    });
  }
  return {
    format: "fast-results",
    headline: `${r.race.course} ${r.race.raceTime} — ${r.race.title} result`,
    caption: buildFastResultsCaption(r),
    script: bundle.script !== undefined ? bundle.script : buildFastResultsScript(r),
    scenes,
    oddsHighlight: r.sp,
    cta: BRAND_HORSE_RACING_FULL_RESULTS,
    voiceGender: bundle.voiceGender ?? RACING_EDITOR_DEFAULT_VOICE_GENDER,
    voiceSpeed: bundle.voiceSpeed ?? RACING_EDITOR_DEFAULT_VOICE_SPEED,
  };
}

export function generateFromRacecard(snap: RacecardSnapshot): GeneratedContent {
  const sorted = [...snap.runners].sort((a, b) => a.number - b.number);
  const fav = snap.topPicks[0];
  const favOdds = fav ? sorted.find((r) => r.horse === fav)?.odds : undefined;
  let scenes = buildRacecardScenes(snap);
  const edits = snap.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec)
          ? { durationSec: ed.durationSec }
          : {}),
      };
    });
  }
  return {
    format: "racecard",
    headline: `${snap.race.course} ${snap.race.raceTime} — ${snap.race.title}`,
    caption: buildRacecardCaption(snap),
    script:
      snap.script !== undefined && String(snap.script).trim() !== ""
        ? snap.script
        : buildRacecardScript(snap),
    scenes,
    oddsHighlight: favOdds ?? sorted[0]?.odds,
    cta: "18+ BeGambleAware",
    voiceGender: snap.voiceGender ?? RACING_EDITOR_DEFAULT_VOICE_GENDER,
    voiceSpeed: snap.voiceSpeed ?? RACING_EDITOR_DEFAULT_VOICE_SPEED,
  };
}

/** Short code for headers (e.g. MUN vs LEE) — extend map for common clubs. */
export function abbrevFootballClubName(fullName: string): string {
  const lower = fullName.trim().toLowerCase();
  if (lower.includes("manchester united")) return "MUN";
  if (lower.includes("manchester city")) return "MCI";
  if (lower.includes("leeds united")) return "LEE";
  if (lower.includes("tottenham")) return "TOT";
  if (lower.includes("sunderland")) return "SUN";
  if (lower.includes("liverpool")) return "LIV";
  if (lower.includes("arsenal")) return "ARS";
  if (lower.includes("chelsea")) return "CHE";
  const first = fullName.trim().split(/\s+/)[0] ?? "?";
  return first.slice(0, 3).toUpperCase();
}

export function footballMatchCodeLine(home: FootballLineupSide, away: FootballLineupSide): string {
  return `${abbrevFootballClubName(home.name)} vs ${abbrevFootballClubName(away.name)}`;
}

export function footballMatchCodeFromNames(homeName: string, awayName: string): string {
  return `${abbrevFootballClubName(homeName)} vs ${abbrevFootballClubName(awayName)}`;
}

export function buildFootballLineupsCaption(bundle: FootballLineupBundle): string {
  return `${bundle.home.name} vs ${bundle.away.name} — ${bundle.matchDate} ${bundle.kickoff}. Starting XIs, bench, and availability.`;
}

export function buildFootballLineupsScript(bundle: FootballLineupBundle): string {
  return `Line-ups for ${bundle.home.name} against ${bundle.away.name}. Formations ${bundle.home.formation} and ${bundle.away.formation}. Bench and injury news inside. ${BRAND_FOLLOW}.`;
}

function footballSceneMeta(bundle: FootballLineupBundle): Record<string, unknown> {
  return {
    league: bundle.league,
    matchDate: bundle.matchDate,
    kickoff: bundle.kickoff,
    matchCodeLine: footballMatchCodeLine(bundle.home, bundle.away),
  };
}

function footballBoard1Data(bundle: FootballLineupBundle): Record<string, unknown> {
  return {
    ...footballSceneMeta(bundle),
    homeName: bundle.home.name,
    awayName: bundle.away.name,
    homeFormation: bundle.home.formation,
    awayFormation: bundle.away.formation,
    homeStarters: bundle.home.starters,
    awayStarters: bundle.away.starters,
    homeShirtColor: bundle.home.shirtColor,
    awayShirtColor: bundle.away.shirtColor,
    homeNumberColor: bundle.home.numberColor,
    awayNumberColor: bundle.away.numberColor,
    homeSleeveColor: bundle.home.sleeveColor,
    awaySleeveColor: bundle.away.sleeveColor,
    homeGkShirtColor: bundle.home.gkShirtColor,
    awayGkShirtColor: bundle.away.gkShirtColor,
    width: SHORTS_W,
    height: SHORTS_H,
  };
}

export function buildFootballLineupsScenes(bundle: FootballLineupBundle): SceneSpec[] {
  return [
    scene("board-1-lineup-home", "football-board-1", 4, "Starting XI — home", {
      ...footballBoard1Data(bundle),
      lineupHalf: "home",
    }),
    scene("board-1-lineup-away", "football-board-1", 4, "Starting XI — away", {
      ...footballBoard1Data(bundle),
      lineupHalf: "away",
    }),
    scene("board-2-subs", "football-board-2", 3.8, "Bench players", {
      ...footballSceneMeta(bundle),
      homeName: bundle.home.name,
      awayName: bundle.away.name,
      homeBench: bundle.bench.home,
      awayBench: bundle.bench.away,
      homeShirtColor: bundle.home.shirtColor,
      awayShirtColor: bundle.away.shirtColor,
      homeNumberColor: bundle.home.numberColor,
      awayNumberColor: bundle.away.numberColor,
      homeSleeveColor: bundle.home.sleeveColor,
      awaySleeveColor: bundle.away.sleeveColor,
      homeGkShirtColor: bundle.home.gkShirtColor,
      awayGkShirtColor: bundle.away.gkShirtColor,
      homeTrimColor: bundle.home.trimColor,
      awayTrimColor: bundle.away.trimColor,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
    scene("board-3-injuries", "football-board-3", 3.8, "Injuries & suspensions", {
      ...footballSceneMeta(bundle),
      homeName: bundle.home.name,
      awayName: bundle.away.name,
      homeInjuries: bundle.injuries.home,
      awayInjuries: bundle.injuries.away,
      homeShirtColor: bundle.home.shirtColor,
      awayShirtColor: bundle.away.shirtColor,
      homeNumberColor: bundle.home.numberColor,
      awayNumberColor: bundle.away.numberColor,
      homeSleeveColor: bundle.home.sleeveColor,
      awaySleeveColor: bundle.away.sleeveColor,
      homeGkShirtColor: bundle.home.gkShirtColor,
      awayGkShirtColor: bundle.away.gkShirtColor,
      homeTrimColor: bundle.home.trimColor,
      awayTrimColor: bundle.away.trimColor,
      width: SHORTS_W,
      height: SHORTS_H,
    }),
  ];
}

export function generateFromFootballLineups(bundle: FootballLineupBundle): GeneratedContent {
  return {
    format: "football-lineups",
    headline: `${bundle.home.name} vs ${bundle.away.name} — ${bundle.matchDate}`,
    caption: buildFootballLineupsCaption(bundle),
    script: buildFootballLineupsScript(bundle),
    scenes: buildFootballLineupsScenes(bundle),
    cta: BRAND_FOLLOW,
  };
}

/** Rebuild bundle from edited scene data (for persisting tpl-* templates). */
export function footballLineupBundleFromContent(
  content: GeneratedContent,
  base: FootballLineupBundle,
): FootballLineupBundle {
  const pitch = content.scenes.find((s) => s.id === "board-1-lineup-home")?.data ?? {};
  const subs = content.scenes.find((s) => s.id === "board-2-subs")?.data ?? {};
  const inj = content.scenes.find((s) => s.id === "board-3-injuries")?.data ?? {};
  return {
    ...base,
    league: String(pitch.league ?? base.league),
    matchDate: String(pitch.matchDate ?? base.matchDate),
    kickoff: String(pitch.kickoff ?? base.kickoff),
    home: {
      ...base.home,
      name: String(pitch.homeName ?? base.home.name),
      shortName: String(pitch.homeName ?? base.home.shortName ?? base.home.name),
      formation: String(pitch.homeFormation ?? base.home.formation),
      shirtColor: String(pitch.homeShirtColor ?? base.home.shirtColor),
      numberColor: String(pitch.homeNumberColor ?? base.home.numberColor),
      sleeveColor: String(pitch.homeSleeveColor ?? base.home.sleeveColor),
      trimColor: String(pitch.homeTrimColor ?? base.home.trimColor),
      gkShirtColor: String(pitch.homeGkShirtColor ?? base.home.gkShirtColor),
      starters: Array.isArray(pitch.homeStarters) ? (pitch.homeStarters as FootballLineupSide["starters"]) : base.home.starters,
    },
    away: {
      ...base.away,
      name: String(pitch.awayName ?? base.away.name),
      shortName: String(pitch.awayName ?? base.away.shortName ?? base.away.name),
      formation: String(pitch.awayFormation ?? base.away.formation),
      shirtColor: String(pitch.awayShirtColor ?? base.away.shirtColor),
      numberColor: String(pitch.awayNumberColor ?? base.away.numberColor),
      sleeveColor: String(pitch.awaySleeveColor ?? base.away.sleeveColor),
      trimColor: String(pitch.awayTrimColor ?? base.away.trimColor),
      gkShirtColor: String(pitch.awayGkShirtColor ?? base.away.gkShirtColor),
      starters: Array.isArray(pitch.awayStarters) ? (pitch.awayStarters as FootballLineupSide["starters"]) : base.away.starters,
    },
    bench: {
      home: Array.isArray(subs.homeBench) ? (subs.homeBench as FootballLineupBundle["bench"]["home"]) : base.bench.home,
      away: Array.isArray(subs.awayBench) ? (subs.awayBench as FootballLineupBundle["bench"]["away"]) : base.bench.away,
    },
    injuries: {
      home: Array.isArray(inj.homeInjuries) ? (inj.homeInjuries as FootballLineupBundle["injuries"]["home"]) : base.injuries.home,
      away: Array.isArray(inj.awayInjuries) ? (inj.awayInjuries as FootballLineupBundle["injuries"]["away"]) : base.injuries.away,
    },
  };
}

function teamLineUpIntroPayload(
  bundle: TeamLineUpBundle,
  w: number,
  h: number,
): Record<string, unknown> {
  return {
    brandStyle: bundle.brandStyle,
    homeName: bundle.home.name,
    awayName: bundle.away.name,
    introLine: bundle.introLine ?? "Line-ups",
    competition: bundle.competition ?? bundle.league,
    matchDate: bundle.matchDate,
    lineupStatus: bundle.lineupStatus,
    width: w,
    height: h,
  };
}

function teamLineUpCombinedPayload(
  bundle: TeamLineUpBundle,
  w: number,
  h: number,
): Record<string, unknown> {
  return {
    brandStyle: bundle.brandStyle,
    homeName: bundle.home.name,
    awayName: bundle.away.name,
    lineupStatus: bundle.lineupStatus,
    homeStarters: resolveStarterCollisions(
      mapStartersToCombinedHalf(bundle.home.starters, "home"),
      collisionOptsForExport(w, h),
    ),
    awayStarters: resolveStarterCollisions(
      mapStartersToCombinedHalf(bundle.away.starters, "away"),
      collisionOptsForExport(w, h),
    ),
    homeShirtColor: bundle.home.shirtColor,
    homeSleeveColor: bundle.home.sleeveColor ?? bundle.home.trimColor ?? "#ffffff",
    homeTrimColor: bundle.home.trimColor ?? "#ffffff",
    homeGkShirtColor: bundle.home.gkShirtColor ?? "#111827",
    awayShirtColor: bundle.away.shirtColor,
    awaySleeveColor: bundle.away.sleeveColor ?? bundle.away.trimColor ?? "#ffffff",
    awayTrimColor: bundle.away.trimColor ?? "#ffffff",
    awayGkShirtColor: bundle.away.gkShirtColor ?? "#111827",
    width: w,
    height: h,
  };
}

function teamLineUpOutroPayload(
  bundle: TeamLineUpBundle,
  w: number,
  h: number,
): Record<string, unknown> {
  const brand = teamLineUpBrand(bundle.brandStyle ?? "sport365");
  return {
    brandStyle: bundle.brandStyle,
    outroLine: bundle.outroLine ?? `For more coverage, head to ${brand.watermark}`,
    width: w,
    height: h,
  };
}

function teamLineUpScenePayload(
  bundle: TeamLineUpBundle,
  side: "home" | "away",
  w: number,
  h: number,
): Record<string, unknown> {
  const team = side === "home" ? bundle.home : bundle.away;
  const opponent = side === "home" ? bundle.away : bundle.home;
  return {
    brandStyle: bundle.brandStyle,
    lineupSide: side,
    lineupStatus: bundle.lineupStatus,
    teamName: team.name,
    opponentName: opponent.name,
    homeName: bundle.home.name,
    awayName: bundle.away.name,
    shirtColor: team.shirtColor,
    sleeveColor: team.sleeveColor ?? team.trimColor ?? "#ffffff",
    trimColor: team.trimColor ?? "#ffffff",
    gkShirtColor: team.gkShirtColor ?? "#111827",
    starters: resolveStarterCollisions(team.starters, collisionOptsForExport(w, h)),
    width: w,
    height: h,
  };
}

export function buildTeamLineUpScenes(bundle: TeamLineUpBundle): SceneSpec[] {
  const { width: w, height: h } = teamLineUpExportDimensions(bundle.exportAspect ?? "portrait");
  const status = bundle.lineupStatus === "confirmed" ? "Confirmed" : "Predicted";
  const scenes: SceneSpec[] = [
    scene("intro", "team-line-up-intro", 3, `${status} line-ups`, teamLineUpIntroPayload(bundle, w, h)),
  ];

  const showHome = bundle.teamView === "home" || bundle.teamView === "both";
  const showAway = bundle.teamView === "away" || bundle.teamView === "both";

  if (showHome) {
    scenes.push(
      scene(
        "lineup-home",
        "team-line-up-card",
        5,
        `${bundle.home.name} ${status} XI`,
        teamLineUpScenePayload(bundle, "home", w, h),
      ),
    );
  }
  if (showAway) {
    scenes.push(
      scene(
        "lineup-away",
        "team-line-up-card",
        5,
        `${bundle.away.name} ${status} XI`,
        teamLineUpScenePayload(bundle, "away", w, h),
      ),
    );
  }
  if (bundle.teamView === "both") {
    scenes.push(
      scene(
        "lineup-combined",
        "team-line-up-combined",
        6,
        `${bundle.home.name} v ${bundle.away.name}`,
        teamLineUpCombinedPayload(bundle, w, h),
      ),
    );
  }

  scenes.push(scene("outro", "team-line-up-outro", 3, "Outro", teamLineUpOutroPayload(bundle, w, h)));
  return scenes;
}

function teamSheetSidePayload(
  bundle: TeamSheetBundle,
  side: "home" | "away",
  w: number,
  h: number,
): Record<string, unknown> {
  const team = side === "home" ? bundle.home : bundle.away;
  const opponent = side === "home" ? bundle.away : bundle.home;
  const bench = side === "home" ? bundle.bench.home : bundle.bench.away;
  const heroPlayerName =
    bundle.heroPlayerName?.trim() ||
    pickDefaultHeroPlayer(
      team.starters.map((s) => ({
        n: s.n,
        name: s.name,
        gk: s.gk,
        surname: s.surname,
      })),
    );
  return {
    brandStyle: bundle.brandStyle,
    lineupStatus: bundle.lineupStatus,
    teamName: team.name,
    opponentName: opponent.name,
    competition: bundle.competition ?? bundle.league,
    matchDate: bundle.matchDate,
    formation: team.formation,
    shirtColor: team.shirtColor,
    starters: [...team.starters].sort((a, b) => {
      if (a.gk && !b.gk) return -1;
      if (!a.gk && b.gk) return 1;
      return (a.n || 99) - (b.n || 99);
    }),
    subs: bench,
    heroPlayerName,
    width: w,
    height: h,
  };
}

function teamSheetCombinedPayload(bundle: TeamSheetBundle, w: number, h: number): Record<string, unknown> {
  const sortXi = (starters: TeamSheetBundle["home"]["starters"]) =>
    [...starters].sort((a, b) => {
      if (a.gk && !b.gk) return -1;
      if (!a.gk && b.gk) return 1;
      return (a.n || 99) - (b.n || 99);
    });
  return {
    brandStyle: bundle.brandStyle,
    homeName: bundle.home.name,
    awayName: bundle.away.name,
    competition: bundle.competition ?? bundle.league,
    matchDate: bundle.matchDate,
    lineupStatus: bundle.lineupStatus,
    homeStarters: sortXi(bundle.home.starters),
    awayStarters: sortXi(bundle.away.starters),
    homeSubs: bundle.bench.home,
    awaySubs: bundle.bench.away,
    width: w,
    height: h,
  };
}

export function buildTeamSheetScenes(bundle: TeamSheetBundle): SceneSpec[] {
  const variant = bundle.sheetVariant;
  const templateId = `team-sheet-${variant}`;
  const { width: w, height: h } = teamLineUpExportDimensions(bundle.exportAspect ?? "portrait");
  const status = bundle.lineupStatus === "confirmed" ? "Confirmed" : "Predicted";

  if (variant === "combined") {
    return [
      scene(
        "sheet-combined",
        templateId,
        5,
        `${bundle.home.name} v ${bundle.away.name}`,
        teamSheetCombinedPayload(bundle, w, h),
      ),
    ];
  }

  const scenes: SceneSpec[] = [];
  const showHome = bundle.teamView === "home" || bundle.teamView === "both";
  const showAway = bundle.teamView === "away" || bundle.teamView === "both";

  if (showHome) {
    scenes.push(
      scene(
        "sheet-home",
        templateId,
        5,
        `${bundle.home.name} ${status} XI`,
        teamSheetSidePayload(bundle, "home", w, h),
      ),
    );
  }
  if (showAway) {
    scenes.push(
      scene(
        "sheet-away",
        templateId,
        5,
        `${bundle.away.name} ${status} XI`,
        teamSheetSidePayload(bundle, "away", w, h),
      ),
    );
  }
  return scenes;
}

export function buildTeamSheetCaption(bundle: TeamSheetBundle): string {
  if (bundle.generateAiCaption && bundle.aiCaption?.trim()) return bundle.aiCaption.trim();
  const side = bundle.teamView === "away" ? "away" : "home";
  return buildTeamLineUpAiCaption(bundle.home, bundle.away, bundle.lineupStatus, side);
}

export function buildTeamSheetScript(bundle: TeamSheetBundle): string {
  const side = bundle.teamView === "away" ? bundle.away : bundle.home;
  const opp = bundle.teamView === "away" ? bundle.home : bundle.away;
  return `${side.name} ${bundle.lineupStatus} team sheet against ${opp.name}. ${BRAND_FOLLOW}.`;
}

export function generateFromTeamSheet(bundle: TeamSheetBundle): GeneratedContent {
  return {
    format: "team-sheet",
    headline: `${bundle.home.name} vs ${bundle.away.name} — Team Sheet`,
    caption: buildTeamSheetCaption(bundle),
    script: buildTeamSheetScript(bundle),
    scenes: buildTeamSheetScenes(bundle),
    cta: BRAND_FOLLOW,
  };
}

function scoreLinePayload(bundle: ScoreLineBundle, w: number, h: number): Record<string, unknown> {
  const ctx = bundle.matchContext;
  return {
    brandStyle: bundle.brandStyle,
    homeTeam: ctx.homeTeam,
    awayTeam: ctx.awayTeam,
    homeScore: ctx.homeScore,
    awayScore: ctx.awayScore,
    status: ctx.status,
    statusLabel: ctx.statusLabel,
    statusDisplay: bundle.statusDisplay,
    homeLogoUrl: ctx.homeLogoUrl,
    awayLogoUrl: ctx.awayLogoUrl,
    competition: bundle.competition,
    matchDate: bundle.matchDate,
    heroImageUrl: bundle.heroImageUrl,
    width: w,
    height: h,
  };
}

export function buildScoreLineScenes(bundle: ScoreLineBundle): SceneSpec[] {
  const { width: w, height: h } = teamLineUpExportDimensions(bundle.exportAspect ?? "portrait");
  const ctx = bundle.matchContext;
  return [
    scene(
      "score-main",
      "score-line-full",
      5,
      `${ctx.homeTeam} ${ctx.homeScore}-${ctx.awayScore} ${ctx.awayTeam}`,
      scoreLinePayload(bundle, w, h),
    ),
  ];
}

export function buildScoreLineCaptionFromBundle(bundle: ScoreLineBundle): string {
  if (bundle.generateAiCaption && bundle.aiCaption?.trim()) return bundle.aiCaption.trim();
  return buildScoreLineCaption(bundle.matchContext);
}

export function buildScoreLineScript(bundle: ScoreLineBundle): string {
  const ctx = bundle.matchContext;
  return `${ctx.homeTeam} ${ctx.homeScore}, ${ctx.awayTeam} ${ctx.awayScore}. ${buildScoreLineCaption(ctx)} ${BRAND_FOLLOW}`;
}

export function generateFromScoreLine(bundle: ScoreLineBundle): GeneratedContent {
  const ctx = bundle.matchContext;
  return {
    format: "score-line",
    headline: `${ctx.homeTeam} vs ${ctx.awayTeam} — Score Line`,
    caption: buildScoreLineCaptionFromBundle(bundle),
    script: buildScoreLineScript(bundle),
    scenes: buildScoreLineScenes(bundle),
    cta: BRAND_FOLLOW,
  };
}

export function buildTeamLineUpCaption(bundle: TeamLineUpBundle): string {
  if (bundle.generateAiCaption && bundle.aiCaption?.trim()) return bundle.aiCaption.trim();
  const side = bundle.teamView === "away" ? "away" : "home";
  return buildTeamLineUpAiCaption(bundle.home, bundle.away, bundle.lineupStatus, side);
}

export function buildTeamLineUpScript(bundle: TeamLineUpBundle): string {
  const side = bundle.teamView === "away" ? bundle.away : bundle.home;
  const opp = bundle.teamView === "away" ? bundle.home : bundle.away;
  return `${side.name} ${bundle.lineupStatus} line-up against ${opp.name}. Formation ${side.formation}. ${BRAND_FOLLOW}.`;
}

export function generateFromTeamLineUp(bundle: TeamLineUpBundle): GeneratedContent {
  return {
    format: "team-line-up",
    headline: `${bundle.home.name} vs ${bundle.away.name} — ${bundle.matchDate || bundle.competition || "Line-up"}`,
    caption: buildTeamLineUpCaption(bundle),
    script: buildTeamLineUpScript(bundle),
    scenes: buildTeamLineUpScenes(bundle),
    cta: BRAND_FOLLOW,
  };
}

export function buildF1GridCaption(bundle: F1GridBundle): string {
  const sub = (bundle.subtitle ?? "").trim();
  return `${bundle.title}${sub ? ` — ${sub}` : ""}. ${bundle.drivers.length} drivers.`;
}

export function buildF1GridScript(bundle: F1GridBundle): string {
  const t = (bundle.title ?? "Starting grid").trim();
  const sub = (bundle.subtitle ?? "").trim();
  const head = sub ? `${t}. ${sub}.` : `${t}.`;
  const n = bundle.drivers.length;
  const tail = (bundle.outroLine ?? "Follow PLANETF1 for more.").trim();
  return `${head} Full qualifying grid: ${n} drivers. ${tail}`.replace(/\s+/g, " ").trim();
}

export function buildF1GridScenes(bundle: F1GridBundle): SceneSpec[] {
  const W = SOCIAL_W;
  const H = SOCIAL_H;
  const per = Math.max(1, bundle.rowsPerPage ?? 11);
  const sorted = [...(bundle.drivers ?? [])].sort((a, b) => a.position - b.position);
  const page1 = sorted.slice(0, per);
  const page2 = sorted.slice(per);
  const twoPages = page2.length > 0;
  const base = {
    width: W,
    height: H,
    title: bundle.title,
    subtitle: bundle.subtitle,
    footerBrand: bundle.footerBrand ?? "PLANETF1.com",
    logoUrl: bundle.logoUrl ?? "",
  };
  return [
    scene("intro", "f1-grid-intro", 2.5, bundle.introLine || bundle.title, {
      ...base,
      introLine: bundle.introLine ?? "",
    }),
    scene("grid1", "f1-grid-board", 5, "Grid 1", {
      ...base,
      gridDrivers: page1,
      pageLabel: twoPages ? "1/2" : "1/1",
      highlightTop3: true,
    }),
    scene("grid2", "f1-grid-board", 5, "Grid 2", {
      ...base,
      gridDrivers: page2,
      pageLabel: twoPages ? "2/2" : "2/2",
      highlightTop3: false,
    }),
    scene("outro", "f1-grid-outro", 3, bundle.outroLine || bundle.footerBrand || "PLANETF1.com", {
      ...base,
      outroLine: bundle.outroLine ?? "",
    }),
  ];
}

export function generateFromF1Grid(bundle: F1GridBundle): GeneratedContent {
  let scenes = buildF1GridScenes(bundle);
  const edits = bundle.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec)
          ? { durationSec: ed.durationSec }
          : {}),
      };
    });
  }
  const script = bundle.script !== undefined ? bundle.script : buildF1GridScript(bundle);
  return {
    format: "f1-grid",
    headline: `${bundle.title} — ${bundle.subtitle}`,
    caption: buildF1GridCaption(bundle),
    script,
    scenes,
    oddsHighlight: "",
    cta: bundle.footerBrand ?? "PLANETF1.com",
    voiceGender: bundle.voiceGender,
    voiceSpeed: bundle.voiceSpeed ?? 1,
  };
}

export function buildF1ResultsCaption(bundle: F1ResultsBundle): string {
  const sub = (bundle.subtitle ?? "").trim();
  return `${bundle.title}${sub ? ` — ${sub}` : ""}. ${bundle.drivers.length} drivers.`;
}

export function buildF1ResultsScript(bundle: F1ResultsBundle): string {
  const t = (bundle.title ?? "Race results").trim();
  const sub = (bundle.subtitle ?? "").trim();
  const head = sub ? `${t}. ${sub}.` : `${t}.`;
  const fl = (bundle.fastestLap?.driverName ?? "").trim();
  const tail = (bundle.outroLine ?? "Follow PLANETF1 for more.").trim();
  const fastest = fl ? ` Fastest lap: ${fl}.` : "";
  return `${head} Full results.${fastest} ${tail}`.replace(/\s+/g, " ").trim();
}

export function buildF1ResultsScenes(bundle: F1ResultsBundle): SceneSpec[] {
  const W = SOCIAL_W;
  const H = SOCIAL_H;
  const per = Math.max(1, bundle.rowsPerPage ?? 11);
  const sorted = [...(bundle.drivers ?? [])].sort((a, b) => a.position - b.position);
  const page1 = sorted.slice(0, per);
  const page2 = sorted.slice(per);
  const twoPages = page2.length > 0;
  const base = {
    width: W,
    height: H,
    title: bundle.title,
    subtitle: bundle.subtitle,
    footerBrand: bundle.footerBrand ?? "PLANETF1.com",
    logoUrl: bundle.logoUrl ?? "",
  };
  const fl = bundle.fastestLap;
  return [
    scene("intro", "f1-results-intro", 2.5, bundle.introLine || bundle.title, {
      ...base,
      introLine: bundle.introLine ?? "",
    }),
    scene("results1", "f1-results-board", 5, "Results 1", {
      ...base,
      resultDrivers: page1,
      pageLabel: twoPages ? "1/2" : "1/1",
      highlightTop3: true,
    }),
    scene("results2", "f1-results-board", 5, "Results 2", {
      ...base,
      resultDrivers: page2,
      pageLabel: twoPages ? "2/2" : "2/2",
      highlightTop3: false,
    }),
    scene("outro", "f1-results-outro", 3, bundle.outroLine || bundle.footerBrand || "PLANETF1.com", {
      ...base,
      outroLine: bundle.outroLine ?? "",
      fastestLap: fl,
    }),
  ];
}

export function generateFromF1Results(bundle: F1ResultsBundle): GeneratedContent {
  let scenes = buildF1ResultsScenes(bundle);
  const edits = bundle.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec)
          ? { durationSec: ed.durationSec }
          : {}),
      };
    });
  }
  const script = bundle.script !== undefined ? bundle.script : buildF1ResultsScript(bundle);
  return {
    format: "f1-results",
    headline: `${bundle.title} — ${bundle.subtitle}`,
    caption: buildF1ResultsCaption(bundle),
    script,
    scenes,
    oddsHighlight: "",
    cta: bundle.footerBrand ?? "PLANETF1.com",
    voiceGender: bundle.voiceGender,
    voiceSpeed: bundle.voiceSpeed ?? 1,
  };
}

export function generateFromTeamtalkNews(bundle: TeamtalkNewsBundle): GeneratedContent {
  const preview = teamtalkHeadlinePreview(bundle.headlineLines);
  let scenes = buildTeamtalkNewsScenes(bundle);
  const edits = bundle.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec)
          ? { durationSec: ed.durationSec }
          : {}),
      };
    });
  }
  const script =
    bundle.script !== undefined ? bundle.script : buildTeamtalkNewsScript(bundle);
  return {
    format: "teamtalk-news",
    headline: `${bundle.tag}: ${preview}`,
    caption: buildTeamtalkNewsCaption(bundle),
    script,
    scenes,
    oddsHighlight: "",
    cta: bundle.linkCta,
    voiceGender: bundle.voiceGender,
    voiceSpeed: bundle.voiceSpeed ?? 1,
  };
}

function pickPlanetRugbyRows(
  rows: PlanetRugbyTableRow[],
  mode: PlanetRugbyTableDisplayMode,
  playoffRows: 4 | 6 | 8,
  bottomRows: 4 | 6,
  teamA?: string,
  teamB?: string,
): PlanetRugbyTableRow[] {
  if (mode === "head-to-head") {
    const ta = teamA?.trim();
    const tb = teamB?.trim();
    const byName = new Map(rows.map((r) => [r.team.trim(), r]));
    const picked: PlanetRugbyTableRow[] = [];
    if (ta && byName.get(ta)) picked.push(byName.get(ta)!);
    if (tb && byName.get(tb) && tb !== ta) picked.push(byName.get(tb)!);
    if (picked.length < 2) {
      for (const r of rows) {
        if (!picked.some((p) => p.team === r.team)) picked.push(r);
        if (picked.length >= 2) break;
      }
    }
    return picked.slice(0, 2);
  }
  if (mode === "top-half") return rows.slice(0, Math.max(1, Math.ceil(rows.length / 2)));
  if (mode === "bottom-half") return rows.slice(Math.max(0, Math.floor(rows.length / 2)));
  if (mode === "playoff-race") return rows.slice(0, playoffRows);
  if (mode === "bottom-battle") return rows.slice(Math.max(0, rows.length - bottomRows));
  /** Full table: every row from manual correction / import (sorted by #). One PNG — no multi-slide split. */
  return rows;
}

export function buildPlanetRugbyTableScenes(bundle: PlanetRugbyTableBundle): SceneSpec[] {
  const rows = [...bundle.table.rows].sort((a, b) => a.position - b.position);
  const mode = bundle.tableMode ?? "full-table";
  const picked =
    bundle.tableStyle === "top-five"
      ? rows.slice(0, 5)
      : pickPlanetRugbyRows(
          rows,
          mode,
          bundle.playoffRows ?? 4,
          bundle.bottomRows ?? 4,
          bundle.selectedTeamA,
          bundle.selectedTeamB,
        );
  const base = {
    width: SHORTS_W,
    height: SHORTS_H,
    competition: bundle.table.competition,
    introLine: bundle.introLine ?? `${bundle.table.competition} latest table`,
    headline: bundle.headline ?? "Latest Table",
    subtitle: bundle.subtitle ?? "",
    sourceUrl: bundle.table.sourceUrl,
    updatedAt: bundle.table.updatedAt ?? "",
    showLogo: bundle.showLogo !== false,
    showTeamLogos: bundle.showTeamLogos !== false,
    tableStyle: bundle.tableStyle ?? "standard-image-overlay",
    highlightColor: bundle.highlightColor ?? "#f5c542",
    fontSize: bundle.fontSize ?? 1,
    rowSpacing: bundle.rowSpacing ?? 1,
    tablePosition: bundle.tablePosition ?? "lower-left",
    tableWidthPercent: bundle.tableWidthPercent ?? 94,
    tableHeightPercent: bundle.tableHeightPercent ?? 72,
    tableBackgroundStyle: bundle.tableBackgroundStyle ?? "solid",
    tablePanelOpacity: bundle.tablePanelOpacity ?? 0.82,
    backgroundImageUrl: bundle.backgroundImageUrl ?? "",
    backgroundBlur: bundle.backgroundBlur ?? 0,
    overlayStrength: bundle.overlayStrength ?? 0.55,
    mode,
    playoffRows: bundle.playoffRows ?? 4,
    bottomRows: bundle.bottomRows ?? 4,
    rowsToShow: picked.length,
    selectedTeamA: bundle.selectedTeamA ?? "",
    selectedTeamB: bundle.selectedTeamB ?? "",
    visibleColumns: (
      [
        "position",
        "team",
        "played",
        "won",
        "drawn",
        "lost",
        "pointsDifference",
        "points",
      ] as PlanetRugbyTableColumnKey[]
    ).filter((c) => !(bundle.hiddenColumns ?? []).includes(c)),
  };
  return [
    scene("intro", "planet-rugby-intro", bundle.introDurationSec ?? 2.2, base.introLine, base),
    scene("table-1", "planet-rugby-table", bundle.mainDurationSec ?? 4.6, `${base.competition} table`, {
      ...base,
      rows: picked,
      pageLabel: "1/1",
    }),
    scene(
      "outro",
      "planet-rugby-outro",
      bundle.outroDurationSec ?? 2.2,
      bundle.outroLine ?? "For more rugby coverage, head to PlanetRugby.com",
      { ...base, outroLine: bundle.outroLine ?? "For more rugby coverage, head to PlanetRugby.com" },
    ),
  ];
}

export function generateFromPlanetRugbyTable(bundle: PlanetRugbyTableBundle): GeneratedContent {
  let scenes = buildPlanetRugbyTableScenes(bundle);
  const edits = bundle.sceneEdits;
  if (edits && typeof edits === "object") {
    scenes = scenes.map((s) => {
      const ed = edits[s.id];
      if (!ed) return s;
      return {
        ...s,
        ...(ed.captionLine !== undefined ? { captionLine: ed.captionLine } : {}),
        ...(typeof ed.durationSec === "number" && Number.isFinite(ed.durationSec) ? { durationSec: ed.durationSec } : {}),
      };
    });
  }
  return {
    format: "planet-rugby-table",
    headline: `${bundle.table.competition} — ${bundle.headline ?? "Latest Table"}`,
    caption: `${bundle.table.competition} table update from Planet Rugby.`,
    script:
      bundle.voiceoverEnabled === false
        ? ""
        : bundle.script ??
          `Latest ${bundle.table.competition} table. For more rugby coverage, head to PlanetRugby.com`,
    scenes,
    cta: "PlanetRugby.com",
    voiceGender: bundle.voiceGender ?? "male",
    voiceSpeed: bundle.voiceSpeed ?? 1,
  };
}

export function generateFromPlanetFootballTable(bundle: PlanetFootballTableBundle): GeneratedContent {
  const displayBrand = normalizePlanetFootballDisplayBrand(bundle.displayBrand);
  const brandDefaults = planetFootballBrandDefaults(displayBrand);
  const match = bundle.matchContext;
  const matchSceneData = match
    ? {
        matchContext: match,
        showMatchScore: bundle.showMatchScore !== false,
        showMatchScorers: bundle.showMatchScorers !== false,
        showStandingsTable: bundle.showStandingsTable !== false,
        brandLogoScale: bundle.brandLogoScale ?? 1.85,
      }
    : { brandLogoScale: bundle.brandLogoScale ?? 1.85 };
  const highlightColor = bundle.highlightColor ?? brandDefaults.highlightColor;
  const baseScenes = buildPlanetRugbyTableScenes(bundle as unknown as PlanetRugbyTableBundle).map((s) => ({
    ...s,
    templateId:
      s.templateId === "planet-rugby-intro"
        ? "planet-football-intro"
        : s.templateId === "planet-rugby-outro"
          ? "planet-football-outro"
          : "planet-football-table",
    data: {
      ...s.data,
      ...matchSceneData,
      brand: displayBrand,
      sourceUrl: bundle.table.sourceUrl,
      highlightColor,
      highlightMode: "brand",
    },
  }));
  const scenes = baseScenes;
  const site = brandDefaults.cta;
  const defaultScript = match
    ? `${match.homeTeam} beat ${match.awayTeam} ${match.homeScore}-${match.awayScore}. Check the updated ${bundle.table.competition} standings. For more coverage, head to ${site}`
    : `Latest ${bundle.table.competition} standings. For more coverage, head to ${site}`;
  return {
    format: "planet-football-table",
    headline: `${bundle.table.competition} - ${bundle.headline ?? "Latest Table"}`,
    caption: match
      ? `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam} · ${bundle.table.competition}`
      : `${bundle.table.competition} standings from ${brandDefaults.brandFooter}.`,
    script:
      bundle.voiceoverEnabled === false
        ? ""
        : bundle.script ?? defaultScript,
    scenes,
    cta: bundle.outroLine?.includes(".com") ? bundle.outroLine.replace(/^.*head to /i, "") : site,
    voiceGender: bundle.voiceGender ?? "male",
    voiceSpeed: bundle.voiceSpeed ?? 1,
  };
}

export function generateContent(
  format: ContentFormat,
  payload:
    | NextOffBundle
    | FastResultBundle
    | RacecardSnapshot
    | FootballLineupBundle
    | TeamtalkNewsBundle
    | F1GridBundle
    | F1ResultsBundle
    | PlanetFootballTableBundle
    | PlanetRugbyTableBundle
    | TeamLineUpBundle
    | TeamSheetBundle
    | ScoreLineBundle,
): GeneratedContent {
  if (format === "next-off") return generateFromNextOff(payload as NextOffBundle);
  if (format === "fast-results") return generateFromFastResult(payload as FastResultBundle);
  if (format === "football-lineups") {
    return generateFromFootballLineups(payload as FootballLineupBundle);
  }
  if (format === "teamtalk-news") {
    return generateFromTeamtalkNews(payload as TeamtalkNewsBundle);
  }
  if (format === "f1-grid") {
    return generateFromF1Grid(payload as F1GridBundle);
  }
  if (format === "f1-results") {
    return generateFromF1Results(payload as F1ResultsBundle);
  }
  if (format === "planet-football-table") {
    return generateFromPlanetFootballTable(payload as PlanetFootballTableBundle);
  }
  if (format === "planet-rugby-table") {
    return generateFromPlanetRugbyTable(payload as PlanetRugbyTableBundle);
  }
  if (format === "team-line-up") {
    return generateFromTeamLineUp(payload as TeamLineUpBundle);
  }
  if (format === "team-sheet") {
    return generateFromTeamSheet(payload as TeamSheetBundle);
  }
  if (format === "score-line") {
    return generateFromScoreLine(payload as ScoreLineBundle);
  }
  return generateFromRacecard(payload as RacecardSnapshot);
}

export function materializeFromTemplate(source: TemplateSource): GeneratedContent {
  switch (source.format) {
    case "next-off":
      return generateFromNextOff(source.bundle);
    case "fast-results":
      return generateFromFastResult(source.bundle);
    case "racecard":
      return generateFromRacecard(source.snapshot);
    case "football-lineups":
      return generateFromFootballLineups(source.bundle);
    case "teamtalk-news":
      return generateFromTeamtalkNews(source.bundle);
    case "f1-grid":
      return generateFromF1Grid(source.bundle);
    case "f1-results":
      return generateFromF1Results(source.bundle);
    case "planet-football-table":
      return generateFromPlanetFootballTable(source.bundle);
    case "planet-rugby-table":
      return generateFromPlanetRugbyTable(source.bundle);
    case "team-line-up":
      return generateFromTeamLineUp(source.bundle);
    case "team-sheet":
      return generateFromTeamSheet(source.bundle);
    case "score-line":
      return generateFromScoreLine(source.bundle);
  }
}

/** Rebuild scenes & copy from template while keeping voice settings. */
export function applyTemplateWithPreferences(
  prev: GeneratedContent | null,
  source: TemplateSource,
): GeneratedContent {
  const next = materializeFromTemplate(source);
  return {
    ...next,
    templateSource: source,
    voiceGender: prev?.voiceGender ?? next.voiceGender,
    voiceSpeed: prev?.voiceSpeed ?? next.voiceSpeed,
  };
}
