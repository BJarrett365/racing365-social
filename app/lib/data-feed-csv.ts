import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { defaultSilksForIndex } from "@/app/lib/silk-presets";
import type { GeneratedContent, Movement, Placing, Race, RacecardNonRunner, Runner } from "@/types";
import { computeSyncFromScript } from "@/app/lib/script-scene-captions";

/** Max horses / placing rows in Data feed CSV (export slots + import cap). */
export const MAX_CSV_HORSES = 30;

const MOVEMENT_VALUES: Movement[] = ["steady", "backed", "drift", "unknown"];

function parseMovement(v: string | undefined, fallback: Movement): Movement {
  if (v === undefined) return fallback;
  const t = v.trim().toLowerCase();
  return MOVEMENT_VALUES.includes(t as Movement) ? (t as Movement) : fallback;
}

function trimTrailingEmptyRacecardRunners(runners: Runner[]): Runner[] {
  let end = runners.length;
  while (end > 0) {
    const r = runners[end - 1]!;
    const hasHorse = !!(r.horse ?? "").trim();
    const code = (r.silks?.silkCode ?? "").trim();
    const url = (r.silks?.imageUrl ?? "").trim();
    if (hasHorse || code || url) break;
    end--;
  }
  return runners.slice(0, end);
}

function trimTrailingEmptyPlacings(placings: Placing[]): Placing[] {
  let end = placings.length;
  while (end > 0) {
    const p = placings[end - 1]!;
    const hasHorse = !!(p.horse ?? "").trim();
    const code = (p.silks?.silkCode ?? "").trim();
    const url = (p.silks?.imageUrl ?? "").trim();
    if (hasHorse || code || url) break;
    end--;
  }
  return placings.slice(0, end);
}

function maxIndexFromKeys(rows: Record<string, string>, re: RegExp): number {
  let max = 0;
  for (const k of Object.keys(rows)) {
    const m = re.exec(k);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

function jsonValStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function parseNumFromUnknown(v: unknown, fb: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v === undefined || v === null) return fb;
  const t = String(v).trim();
  if (t === "") return fb;
  const n = Number(t);
  return Number.isFinite(n) ? n : fb;
}

function mergeRaceFromJsonFeed(base: Race, jr: Record<string, unknown>): Race {
  if (!jr || Object.keys(jr).length === 0) return base;
  const cls = jr["class"];
  return {
    ...base,
    id: jsonValStr(jr.id) ?? base.id,
    course: jsonValStr(jr.course) ?? base.course,
    raceTime: jsonValStr(jr.raceTime) ?? base.raceTime,
    title: jsonValStr(jr.title) ?? base.title,
    distance: jsonValStr(jr.distance) ?? base.distance,
    going: jsonValStr(jr.going) ?? base.going,
    runnersCount: jr.runnersCount !== undefined ? parseNumFromUnknown(jr.runnersCount, base.runnersCount) : base.runnersCount,
    surface: jsonValStr(jr.surface) ?? base.surface,
    listedRunnersIncludingNonRunners:
      jr.listedRunnersIncludingNonRunners !== undefined
        ? parseNumFromUnknown(jr.listedRunnersIncludingNonRunners, base.listedRunnersIncludingNonRunners ?? 0)
        : base.listedRunnersIncludingNonRunners,
    nonRunnersCount:
      jr.nonRunnersCount !== undefined
        ? parseNumFromUnknown(jr.nonRunnersCount, base.nonRunnersCount ?? 0)
        : base.nonRunnersCount,
    class: cls !== undefined ? (typeof cls === "number" ? cls : jsonValStr(cls)) : base.class,
    ageBand: jsonValStr(jr.ageBand) ?? base.ageBand,
    ratingBand: jsonValStr(jr.ratingBand) ?? base.ratingBand,
    prizeGbp: jr.prizeGbp !== undefined ? parseNumFromUnknown(jr.prizeGbp, base.prizeGbp ?? 0) : base.prizeGbp,
  };
}

function runnerFromJsonFeedObject(row: unknown, prev: Runner | undefined, index: number): Runner {
  if (!row || typeof row !== "object") {
    return {
      number: index + 1,
      horse: "",
      odds: "",
      movement: "unknown",
      silks: defaultSilksForIndex(index),
    };
  }
  const r = row as Record<string, unknown>;
  const base: Runner =
    prev ??
    ({
      number: index + 1,
      horse: "",
      odds: "",
      movement: "unknown",
      silks: defaultSilksForIndex(index),
    } as Runner);
  const horse =
    jsonValStr(r.horse) ?? jsonValStr(r.name) ?? jsonValStr(r.horseName) ?? base.horse ?? "";

  let silks: Runner["silks"] | undefined;
  if (r.silks && typeof r.silks === "object") {
    const sr = r.silks as Record<string, unknown>;
    const refId =
      sr.imageRefId !== undefined && sr.imageRefId !== null
        ? parseNumFromUnknown(sr.imageRefId, NaN)
        : undefined;
    silks = {
      ...(base.silks ?? {}),
      silkCode: jsonValStr(sr.silkCode) ?? jsonValStr(sr.silk_code),
      imageUrl: jsonValStr(sr.imageUrl) ?? jsonValStr(sr.image_url),
      provider: jsonValStr(sr.provider),
      imageRefId: refId !== undefined && !Number.isNaN(refId) ? refId : undefined,
      altText: jsonValStr(sr.altText),
    };
  } else {
    silks = base.silks;
  }

  return {
    ...base,
    number: typeof r.number === "number" ? r.number : parseNumFromUnknown(r.number, base.number),
    horse,
    odds: jsonValStr(r.odds) ?? base.odds,
    jockey: jsonValStr(r.jockey) ?? base.jockey,
    trainer: jsonValStr(r.trainer) ?? base.trainer,
    form: jsonValStr(r.form) ?? base.form,
    stars: r.stars !== undefined ? parseNumFromUnknown(r.stars, base.stars ?? 0) : base.stars,
    movement: parseMovement(jsonValStr(r.movement), base.movement ?? "unknown"),
    draw: r.draw !== undefined ? parseNumFromUnknown(r.draw, base.draw ?? 0) : base.draw,
    daysSinceRun:
      r.daysSinceRun !== undefined ? parseNumFromUnknown(r.daysSinceRun, base.daysSinceRun ?? 0) : base.daysSinceRun,
    officialRating:
      r.officialRating !== undefined
        ? parseNumFromUnknown(r.officialRating, base.officialRating ?? 0)
        : base.officialRating,
    weight: jsonValStr(r.weight) ?? base.weight,
    status: jsonValStr(r.status) ?? base.status,
    silks: silks ?? base.silks,
  };
}

function nonRunnersFromJsonFeed(arr: unknown): RacecardNonRunner[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((n) => {
    const o = n as Record<string, unknown>;
    return {
      number: typeof o.number === "number" ? o.number : parseNumFromUnknown(o.number, 0),
      horse: jsonValStr(o.horse) ?? "",
      status: jsonValStr(o.status),
      trainer: jsonValStr(o.trainer),
    };
  });
}

/** Escape one CSV field (RFC 4180 style). */
export function csvEscapeCell(s: string): string {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

/**
 * Parse full CSV text into rows of cells (supports quoted fields with commas and newlines).
 */
export function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      result.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  if (row.length > 0 && (row.some((x) => x !== "") || result.length === 0)) {
    result.push(row);
  }
  return result;
}

/** Turn CSV rows into a key→value map (first column = key). Multiple cells → value = remaining cells rejoined (rare). */
export function rowsToKeyMap(rows: string[][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.length === 0) continue;
    const key = (r[0] ?? "").trim();
    if (!key || key === "key") continue;
    const val = r.length <= 2 ? (r[1] ?? "") : r.slice(1).join(",");
    out[key] = val;
  }
  return out;
}

export function parseDataFeedKeyValueCsv(text: string): Record<string, string> {
  const t = text.trim().replace(/^\uFEFF/, "");
  return rowsToKeyMap(parseCsv(t));
}

/** Ordered key/value pairs for CSV and JSON feed (same semantics as import). */
export function buildDataFeedFlatRowPairs(params: {
  content: GeneratedContent;
  contentId: string;
  versionA: string;
  versionB: string;
  versionC: string;
}): [string, string][] {
  const { content, contentId, versionA, versionB, versionC } = params;
  const pairs: [string, string][] = [];
  const push = (k: string, v: string) => {
    pairs.push([k, v]);
  };
  push("format", content.format);
  push("content_id", contentId);
  push("headline", content.headline ?? "");
  const src = content.templateSource;
  if (src) {
    if (src.format === "next-off") {
      const b = src.bundle;
      push("race_id", b.race.id ?? "");
      push("race_course", b.race.course ?? "");
      push("race_time", b.race.raceTime ?? "");
      push("race_title", b.race.title ?? "");
      push("race_distance", b.race.distance ?? "");
      push("race_going", b.race.going ?? "");
      push("race_runners_count", String(b.race.runnersCount ?? ""));
      b.tips.forEach((t, i) => {
        const n = i + 1;
        push(`tip_${n}_horse`, t.horse ?? "");
        push(`tip_${n}_odds`, t.odds ?? "");
        push(`tip_${n}_stars`, String(t.stars ?? ""));
        push(`tip_${n}_silk_code`, t.silks?.silkCode ?? "");
        push(`tip_${n}_silk_url`, t.silks?.imageUrl ?? "");
      });
    } else if (src.format === "fast-results") {
      const r = src.bundle.result;
      push("race_id", r.race.id ?? "");
      push("race_course", r.race.course ?? "");
      push("race_time", r.race.raceTime ?? "");
      push("race_title", r.race.title ?? "");
      push("race_distance", r.race.distance ?? "");
      push("race_going", r.race.going ?? "");
      push("race_runners_count", String(r.race.runnersCount ?? ""));
      push("winner_horse", r.winner ?? "");
      push("winner_sp", r.sp ?? "");
      push("winner_silk_code", r.placings?.[0]?.silks?.silkCode ?? "");
      push("winner_silk_url", r.placings?.[0]?.silks?.imageUrl ?? "");
      for (let n = 1; n <= MAX_CSV_HORSES; n++) {
        const p = r.placings[n - 1];
        push(`placing_${n}_position`, p ? String(p.position ?? n) : String(n));
        push(`placing_${n}_horse`, p?.horse ?? "");
        push(`placing_${n}_sp`, p?.sp ?? "");
        push(`placing_${n}_silk_code`, p?.silks?.silkCode ?? "");
        push(`placing_${n}_silk_url`, p?.silks?.imageUrl ?? "");
      }
    } else if (src.format === "racecard") {
      const s = src.snapshot;
      push("race_id", s.race.id ?? "");
      push("race_course", s.race.course ?? "");
      push("race_time", s.race.raceTime ?? "");
      push("race_title", s.race.title ?? "");
      push("race_distance", s.race.distance ?? "");
      push("race_going", s.race.going ?? "");
      push("race_runners_count", String(s.race.runnersCount ?? ""));
      for (let n = 1; n <= MAX_CSV_HORSES; n++) {
        const r = s.runners[n - 1];
        push(`runner_${n}_number`, r ? String(r.number ?? n) : String(n));
        push(`runner_${n}_horse`, r?.horse ?? "");
        push(`runner_${n}_odds`, r?.odds ?? "");
        push(`runner_${n}_jockey`, r?.jockey ?? "");
        push(`runner_${n}_trainer`, r?.trainer ?? "");
        push(`runner_${n}_form`, r?.form ?? "");
        push(`runner_${n}_stars`, r ? String(r.stars ?? "") : "");
        push(`runner_${n}_movement`, r?.movement ?? "");
        push(`runner_${n}_silk_code`, r?.silks?.silkCode ?? "");
        push(`runner_${n}_silk_url`, r?.silks?.imageUrl ?? "");
      }
    }
  }
  for (const s of content.scenes) {
    push(`input_${s.id}`, s.captionLine ?? "");
  }
  push("output_short_caption", content.caption ?? "");
  push("output_voiceover_script", content.script ?? "");
  push("output_version_a", versionA);
  push("output_version_b", versionB);
  push("output_version_c", versionC);
  return pairs;
}

export function exportDataFeedKeyValueCsv(params: {
  content: GeneratedContent;
  contentId: string;
  versionA: string;
  versionB: string;
  versionC: string;
}): string {
  const pairs = buildDataFeedFlatRowPairs(params);
  const lines = ["key,value", ...pairs.map(([k, v]) => `${csvEscapeCell(k)},${csvEscapeCell(v)}`)];
  return lines.join("\r\n");
}

export function applyDataFeedImport(
  content: GeneratedContent,
  rows: Record<string, string>,
  contentId: string,
  currentVersions?: { a: string; b: string; c: string },
  /** When importing full API JSON, pass the parsed root so runners, race metadata, and non-runners merge. */
  jsonFeedRoot?: Record<string, unknown> | null,
): {
  content: GeneratedContent;
  versions: { a: string; b: string; c: string };
  warnings: string[];
} {
  const warnings: string[] = [];
  if (rows.format && rows.format !== content.format) {
    warnings.push(
      `CSV format is "${rows.format}" but this editor is "${content.format}". Data was still applied; verify manually.`,
    );
  }
  if (rows.content_id && rows.content_id.trim() !== contentId.trim()) {
    warnings.push(`CSV content_id "${rows.content_id}" does not match editor id "${contentId}".`);
  }

  const versions = {
    a:
      rows.output_version_a !== undefined
        ? rows.output_version_a
        : (currentVersions?.a ?? ""),
    b:
      rows.output_version_b !== undefined
        ? rows.output_version_b
        : (currentVersions?.b ?? ""),
    c:
      rows.output_version_c !== undefined
        ? rows.output_version_c
        : (currentVersions?.c ?? ""),
  };

  const inputUpdates: Record<string, string> = {};
  for (const [k, v] of Object.entries(rows)) {
    if (k.startsWith("input_")) {
      inputUpdates[k.slice("input_".length)] = v;
    }
  }

  let next: GeneratedContent = {
    ...content,
    headline: rows.headline !== undefined ? rows.headline : content.headline,
    caption: rows.output_short_caption !== undefined ? rows.output_short_caption : content.caption,
  };
  const src = next.templateSource;
  if (src) {
    const parseNumber = (v: string | undefined, fb: number) => {
      if (v === undefined) return fb;
      const t = v.trim();
      if (t === "") return fb;
      const n = Number(t);
      return Number.isFinite(n) ? n : fb;
    };
    const racePatch = <T extends { id: string; course: string; raceTime: string; title: string; distance: string; going: string; runnersCount: number }>(
      race: T,
    ): T => ({
      ...race,
      id: rows.race_id !== undefined ? rows.race_id : race.id,
      course: rows.race_course !== undefined ? rows.race_course : race.course,
      raceTime: rows.race_time !== undefined ? rows.race_time : race.raceTime,
      title: rows.race_title !== undefined ? rows.race_title : race.title,
      distance: rows.race_distance !== undefined ? rows.race_distance : race.distance,
      going: rows.race_going !== undefined ? rows.race_going : race.going,
      runnersCount: parseNumber(rows.race_runners_count, race.runnersCount),
    });

    if (src.format === "next-off") {
      const b = src.bundle;
      const tips = b.tips.map((t, i) => {
        const n = i + 1;
        const code = rows[`tip_${n}_silk_code`];
        const url = rows[`tip_${n}_silk_url`];
        return {
          ...t,
          horse: rows[`tip_${n}_horse`] !== undefined ? rows[`tip_${n}_horse`] : t.horse,
          odds: rows[`tip_${n}_odds`] !== undefined ? rows[`tip_${n}_odds`] : t.odds,
          stars: parseNumber(rows[`tip_${n}_stars`], t.stars),
          silks:
            code !== undefined || url !== undefined
              ? { ...(t.silks ?? {}), silkCode: code ?? t.silks?.silkCode, imageUrl: url ?? t.silks?.imageUrl }
              : t.silks,
        };
      });
      const race = racePatch(b.race);
      next = applyTemplateWithPreferences(next, {
        format: "next-off",
        bundle: { ...b, race, tips: tips.map((t) => ({ ...t, race })) },
      });
    } else if (src.format === "fast-results") {
      const r = src.bundle.result;
      const maxFromCsv = maxIndexFromKeys(rows, /^placing_(\d+)_/);
      const maxPlacing = Math.min(MAX_CSV_HORSES, Math.max(r.placings.length, maxFromCsv));
      const placingsRaw: Placing[] = Array.from({ length: maxPlacing }, (_, i) => {
        const n = i + 1;
        const prev = r.placings[i];
        const code = rows[`placing_${n}_silk_code`];
        const url = rows[`placing_${n}_silk_url`];
        const base: Placing =
          prev ??
          ({
            position: n,
            horse: "",
            sp: "",
            silks: defaultSilksForIndex(i),
          } as Placing);
        return {
          ...base,
          position: parseNumber(rows[`placing_${n}_position`], prev?.position ?? n),
          horse: rows[`placing_${n}_horse`] !== undefined ? rows[`placing_${n}_horse`]! : (prev?.horse ?? ""),
          sp: rows[`placing_${n}_sp`] !== undefined ? rows[`placing_${n}_sp`]! : (prev?.sp ?? ""),
          silks:
            code !== undefined || url !== undefined
              ? {
                  ...(prev?.silks ?? base.silks ?? {}),
                  silkCode: code ?? prev?.silks?.silkCode,
                  imageUrl: url ?? prev?.silks?.imageUrl,
                }
              : prev?.silks ?? base.silks,
        };
      });
      const placings = trimTrailingEmptyPlacings(placingsRaw);
      next = applyTemplateWithPreferences(next, {
        format: "fast-results",
        bundle: {
          ...src.bundle,
          result: {
            ...r,
            race: racePatch(r.race),
            winner: rows.winner_horse !== undefined ? rows.winner_horse : r.winner,
            sp: rows.winner_sp !== undefined ? rows.winner_sp : r.sp,
            placings,
          },
        },
      });
    } else if (src.format === "racecard") {
      const s = src.snapshot;
      let mergedRace = racePatch(s.race);
      if (jsonFeedRoot?.race && typeof jsonFeedRoot.race === "object") {
        mergedRace = mergeRaceFromJsonFeed(mergedRace, jsonFeedRoot.race as Record<string, unknown>);
      }

      let runners: Runner[];
      let nonRunners: RacecardNonRunner[] | undefined = s.nonRunners;
      let topPicks = s.topPicks;

      if (jsonFeedRoot && Array.isArray(jsonFeedRoot.runners) && jsonFeedRoot.runners.length > 0) {
        runners = (jsonFeedRoot.runners as unknown[]).map((row, i) =>
          runnerFromJsonFeedObject(row, s.runners[i], i),
        );
        runners = trimTrailingEmptyRacecardRunners(runners);
        if (jsonFeedRoot.nonRunners !== undefined) {
          nonRunners = nonRunnersFromJsonFeed(jsonFeedRoot.nonRunners);
        }
        if (Array.isArray(jsonFeedRoot.topPicks) && jsonFeedRoot.topPicks.every((x) => typeof x === "string")) {
          topPicks = jsonFeedRoot.topPicks as string[];
        }
      } else {
        const maxFromCsv = maxIndexFromKeys(rows, /^runner_(\d+)_/);
        const maxRunner = Math.min(MAX_CSV_HORSES, Math.max(s.runners.length, maxFromCsv));
        const runnersRaw: Runner[] = Array.from({ length: maxRunner }, (_, i) => {
          const n = i + 1;
          const prev = s.runners[i];
          const code = rows[`runner_${n}_silk_code`];
          const url = rows[`runner_${n}_silk_url`];
          const base: Runner =
            prev ??
            ({
              number: n,
              horse: "",
              odds: "",
              movement: "unknown",
              silks: defaultSilksForIndex(i),
            } as Runner);
          return {
            ...base,
            number: parseNumber(rows[`runner_${n}_number`], prev?.number ?? n),
            horse: rows[`runner_${n}_horse`] !== undefined ? rows[`runner_${n}_horse`]! : (prev?.horse ?? ""),
            odds: rows[`runner_${n}_odds`] !== undefined ? rows[`runner_${n}_odds`]! : (prev?.odds ?? ""),
            jockey: rows[`runner_${n}_jockey`] !== undefined ? rows[`runner_${n}_jockey`] ?? "" : (prev?.jockey ?? ""),
            trainer: rows[`runner_${n}_trainer`] !== undefined ? rows[`runner_${n}_trainer`] ?? "" : (prev?.trainer ?? ""),
            form: rows[`runner_${n}_form`] !== undefined ? rows[`runner_${n}_form`] ?? "" : (prev?.form ?? ""),
            stars: parseNumber(rows[`runner_${n}_stars`], prev?.stars ?? 0),
            movement: parseMovement(rows[`runner_${n}_movement`], prev?.movement ?? "unknown"),
            silks:
              code !== undefined || url !== undefined
                ? {
                    ...(prev?.silks ?? base.silks ?? {}),
                    silkCode: code ?? prev?.silks?.silkCode,
                    imageUrl: url ?? prev?.silks?.imageUrl,
                  }
                : prev?.silks ?? base.silks,
          };
        });
        runners = trimTrailingEmptyRacecardRunners(runnersRaw);
      }

      next = applyTemplateWithPreferences(next, {
        format: "racecard",
        snapshot: {
          ...s,
          race: mergedRace,
          runners,
          topPicks,
          ...(nonRunners ? { nonRunners } : {}),
        },
      });
    }
  }

  const scriptFromCsv = rows.output_voiceover_script;
  const shouldSyncScript =
    scriptFromCsv !== undefined && String(scriptFromCsv).trim().length > 0;

  if (shouldSyncScript) {
    const scriptTrim = String(scriptFromCsv).trim();
    const voiceSpeed = next.voiceSpeed ?? 1;
    const { captions, durationSec } = computeSyncFromScript(scriptTrim, next.scenes.length, voiceSpeed);
    next = {
      ...next,
      script: scriptTrim,
      scenes: next.scenes.map((s, i) => ({
        ...s,
        captionLine: captions[i] ?? "",
        durationSec: durationSec[i] ?? s.durationSec,
      })),
    };
  }

  if (Object.keys(inputUpdates).length > 0) {
    next = {
      ...next,
      scenes: next.scenes.map((s) =>
        inputUpdates[s.id] !== undefined ? { ...s, captionLine: inputUpdates[s.id]! } : s,
      ),
    };
  }

  return { content: next, versions, warnings };
}
