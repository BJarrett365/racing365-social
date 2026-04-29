import type { GeneratedContent } from "@/types";
import { MAX_CSV_HORSES } from "@/app/lib/data-feed-csv";

/** sessionStorage key: pending CSV/JSON feed applied once after “New template” navigates to the editor. */
export const PENDING_TEMPLATE_FEED_STORAGE_KEY = "r365-pending-template-feed";

/** Stable identifier for API clients and documentation. */
export const DATA_FEED_JSON_KIND = "racing365-data-feed" as const;
export const DATA_FEED_JSON_SCHEMA_VERSION = 1;

function asStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

/** APIs often use `name` / `horseName` instead of `horse`. */
function pickHorseName(row: Record<string, unknown>): string | undefined {
  const keys = [
    "horse",
    "name",
    "horseName",
    "horse_name",
    "runnerName",
    "runner_name",
    "selection",
    "selectionName",
  ] as const;
  for (const k of keys) {
    const s = asStr(row[k]);
    if (s !== undefined) return s;
  }
  return undefined;
}

function unwrapPayload(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== "object") return null;
  let cur: unknown = parsed;
  for (let depth = 0; depth < 4; depth++) {
    if (!cur || typeof cur !== "object") return null;
    const o = cur as Record<string, unknown>;
    if ("feed" in o && o.feed && typeof o.feed === "object") {
      cur = o.feed;
      continue;
    }
    if ("data" in o && o.data && typeof o.data === "object") {
      cur = o.data;
      continue;
    }
    if ("payload" in o && o.payload && typeof o.payload === "object") {
      cur = o.payload;
      continue;
    }
    if ("body" in o && o.body && typeof o.body === "object") {
      cur = o.body;
      continue;
    }
    return o;
  }
  return cur as Record<string, unknown>;
}

function flattenSilks(
  silks: unknown,
  out: Record<string, string>,
  prefix: string,
) {
  if (!silks || typeof silks !== "object") return;
  const s = silks as Record<string, unknown>;
  const code = asStr(s.silkCode ?? s.silk_code);
  const url = asStr(s.imageUrl ?? s.image_url);
  if (code !== undefined) out[`${prefix}_silk_code`] = code;
  if (url !== undefined) out[`${prefix}_silk_url`] = url;
}

function flattenRace(race: unknown, out: Record<string, string>) {
  if (!race || typeof race !== "object") return;
  const r = race as Record<string, unknown>;
  const set = (csvKey: string, ...vals: unknown[]) => {
    for (const v of vals) {
      const s = asStr(v);
      if (s !== undefined) {
        out[csvKey] = s;
        return;
      }
    }
  };
  set("race_id", r.id, r.race_id);
  set("race_course", r.course, r.race_course);
  set("race_time", r.raceTime, r.race_time);
  set("race_title", r.title, r.race_title);
  set("race_distance", r.distance, r.race_distance);
  set("race_going", r.going, r.race_going);
  set("race_runners_count", r.runnersCount, r.runners_count);
}

function flattenOutputs(outputs: unknown, out: Record<string, string>) {
  if (!outputs || typeof outputs !== "object") return;
  const o = outputs as Record<string, unknown>;
  const set = (csvKey: string, ...vals: unknown[]) => {
    for (const v of vals) {
      const s = asStr(v);
      if (s !== undefined) {
        out[csvKey] = s;
        return;
      }
    }
  };
  set("output_short_caption", o.shortCaption, o.short_caption);
  set("output_voiceover_script", o.voiceoverScript, o.voiceover_script);
  set("output_version_a", o.versionA, o.version_a);
  set("output_version_b", o.versionB, o.version_b);
  set("output_version_c", o.versionC, o.version_c);
}

function flattenSceneCaptions(sc: unknown, out: Record<string, string>) {
  if (!sc || typeof sc !== "object" || Array.isArray(sc)) return;
  for (const [id, line] of Object.entries(sc as Record<string, unknown>)) {
    const s = asStr(line);
    if (s !== undefined) out[`input_${id}`] = s;
  }
}

function flattenTipsArray(tips: unknown[], out: Record<string, string>) {
  tips.forEach((t, i) => {
    if (i >= MAX_CSV_HORSES) return;
    const n = i + 1;
    if (!t || typeof t !== "object") return;
    const row = t as Record<string, unknown>;
    const h = pickHorseName(row);
    const odds = asStr(row.odds);
    const stars = asStr(row.stars);
    if (h !== undefined) out[`tip_${n}_horse`] = h;
    if (odds !== undefined) out[`tip_${n}_odds`] = odds;
    if (stars !== undefined) out[`tip_${n}_stars`] = stars;
    flattenSilks(row.silks, out, `tip_${n}`);
  });
}

function flattenRunnersArray(runners: unknown[], out: Record<string, string>) {
  runners.forEach((r, i) => {
    if (i >= MAX_CSV_HORSES) return;
    const n = i + 1;
    if (!r || typeof r !== "object") return;
    const row = r as Record<string, unknown>;
    const set = (suffix: string, ...vals: unknown[]) => {
      for (const v of vals) {
        const s = asStr(v);
        if (s !== undefined) {
          out[`runner_${n}_${suffix}`] = s;
          return;
        }
      }
    };
    set("number", row.number);
    const horse = pickHorseName(row);
    if (horse !== undefined) out[`runner_${n}_horse`] = horse;
    set("odds", row.odds);
    set("jockey", row.jockey);
    set("trainer", row.trainer);
    set("form", row.form);
    set("stars", row.stars);
    set("movement", row.movement);
    flattenSilks(row.silks, out, `runner_${n}`);
  });
}

function flattenResultBlock(res: Record<string, unknown>, out: Record<string, string>) {
  const w =
    asStr(res.winner ?? res.winnerName ?? res.winner_name ?? res.winningHorse) ?? pickHorseName(res);
  const sp = asStr(res.sp ?? res.startingPrice ?? res.starting_price);
  if (w !== undefined) out["winner_horse"] = w;
  if (sp !== undefined) out["winner_sp"] = sp;
  flattenSilks(res.winnerSilks ?? res.winner_silks, out, "winner");

  const raceInner = res.race;
  flattenRace(raceInner, out);

  const placings = res.placings;
  if (Array.isArray(placings)) {
    placings.forEach((p, i) => {
      if (i >= MAX_CSV_HORSES) return;
      const n = i + 1;
      if (!p || typeof p !== "object") return;
      const row = p as Record<string, unknown>;
      const pos = asStr(row.position);
      const horse = pickHorseName(row);
      const spP = asStr(row.sp);
      if (pos !== undefined) out[`placing_${n}_position`] = pos;
      if (horse !== undefined) out[`placing_${n}_horse`] = horse;
      if (spP !== undefined) out[`placing_${n}_sp`] = spP;
      flattenSilks(row.silks, out, `placing_${n}`);
    });
  }
}

function flattenNestedFeed(root: Record<string, unknown>, out: Record<string, string>) {
  const fmt = asStr(root.format);
  if (fmt !== undefined) out["format"] = fmt;

  const cid = asStr(root.contentId ?? root.content_id);
  if (cid !== undefined) out["content_id"] = cid;

  const hl = asStr(root.headline);
  if (hl !== undefined) out["headline"] = hl;

  flattenOutputs(root.outputs, out);
  flattenSceneCaptions(root.sceneCaptions ?? root.scene_captions, out);

  const snap = root.snapshot;
  if (snap && typeof snap === "object" && !Array.isArray(snap)) {
    const s = snap as Record<string, unknown>;
    flattenRace(s.race, out);
    if (Array.isArray(s.runners)) flattenRunnersArray(s.runners, out);
  }

  const bund = root.bundle;
  if (bund && typeof bund === "object") {
    const b = bund as Record<string, unknown>;
    flattenRace(b.race, out);
    if (Array.isArray(b.tips)) flattenTipsArray(b.tips, out);
    if (b.result && typeof b.result === "object") {
      flattenResultBlock(b.result as Record<string, unknown>, out);
    }
  }

  flattenRace(root.race, out);

  if (Array.isArray(root.tips)) flattenTipsArray(root.tips, out);

  if (Array.isArray(root.runners)) flattenRunnersArray(root.runners, out);

  if (root.result && typeof root.result === "object") {
    flattenResultBlock(root.result as Record<string, unknown>, out);
  }
}

function mergeFlatCsvStyleKeysFromRoot(root: Record<string, unknown>, out: Record<string, string>) {
  const csvKey = (k: string) =>
    k === "format" ||
    k === "content_id" ||
    k === "contentId" ||
    k === "headline" ||
    k.startsWith("input_") ||
    k.startsWith("output_") ||
    k.startsWith("race_") ||
    k.startsWith("runner_") ||
    k.startsWith("tip_") ||
    k.startsWith("placing_") ||
    k.startsWith("winner_");

  for (const [k, v] of Object.entries(root)) {
    if (!csvKey(k)) continue;
    const s = asStr(v);
    if (s === undefined) continue;
    if (k === "contentId") out["content_id"] = s;
    else out[k] = s;
  }
}

/**
 * Parse a JSON document from an API or file into the same flat key map used by CSV import.
 * Supports nested `racing365-data-feed` objects, optional `feed` / `data` wrappers, and flat CSV-style keys.
 */
/** Parse JSON into flat import rows plus the original root (for full racecard runners / non-runners). */
export function parseDataFeedJsonDocument(text: string): {
  rows: Record<string, string>;
  root: Record<string, unknown> | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
  const root = unwrapPayload(parsed);
  if (!root) throw new Error("Invalid JSON feed: expected object");

  const out: Record<string, string> = {};
  flattenNestedFeed(root, out);
  mergeFlatCsvStyleKeysFromRoot(root, out);
  return { rows: out, root };
}

export function parseDataFeedJsonToRows(text: string): Record<string, string> {
  return parseDataFeedJsonDocument(text).rows;
}

export function buildDataFeedApiJsonV1Object(params: {
  content: GeneratedContent;
  contentId: string;
  versionA: string;
  versionB: string;
  versionC: string;
}): Record<string, unknown> {
  const { content, contentId, versionA, versionB, versionC } = params;
  const sceneCaptions: Record<string, string> = {};
  for (const s of content.scenes) {
    sceneCaptions[s.id] = s.captionLine ?? "";
  }

  const base: Record<string, unknown> = {
    schemaVersion: DATA_FEED_JSON_SCHEMA_VERSION,
    kind: DATA_FEED_JSON_KIND,
    format: content.format,
    contentId,
    headline: content.headline ?? "",
    sceneCaptions,
    outputs: {
      shortCaption: content.caption ?? "",
      voiceoverScript: content.script ?? "",
      versionA,
      versionB,
      versionC,
    },
  };

  const src = content.templateSource;
  if (!src) return base;

  if (src.format === "next-off") {
    const b = src.bundle;
    return {
      ...base,
      race: b.race,
      tips: b.tips.map((t) => ({
        horse: t.horse,
        odds: t.odds,
        stars: t.stars,
        reason: t.reason,
        kicker: t.kicker,
        silks: t.silks ?? {},
      })),
    };
  }

  if (src.format === "fast-results") {
    const r = src.bundle.result;
    return {
      ...base,
      race: r.race,
      result: {
        winner: r.winner,
        sp: r.sp,
        winnerSilks: r.placings?.[0]?.silks ?? {},
        placings: r.placings.map((p) => ({
          position: p.position,
          horse: p.horse,
          sp: p.sp,
          silks: p.silks ?? {},
        })),
      },
    };
  }

  if (src.format === "racecard") {
    const s = src.snapshot;
    const out: Record<string, unknown> = {
      ...base,
      race: s.race,
      runners: s.runners.map((r) => ({
        number: r.number,
        horse: r.horse,
        odds: r.odds,
        jockey: r.jockey,
        trainer: r.trainer,
        form: r.form,
        stars: r.stars,
        movement: r.movement,
        draw: r.draw,
        daysSinceRun: r.daysSinceRun,
        officialRating: r.officialRating,
        weight: r.weight,
        status: r.status,
        silks: r.silks ?? {},
      })),
      topPicks: s.topPicks,
    };
    if (s.nonRunners?.length) out.nonRunners = s.nonRunners;
    return out;
  }

  return base;
}

export function exportDataFeedApiJsonV1String(params: {
  content: GeneratedContent;
  contentId: string;
  versionA: string;
  versionB: string;
  versionC: string;
}): string {
  return JSON.stringify(buildDataFeedApiJsonV1Object(params), null, 2);
}
