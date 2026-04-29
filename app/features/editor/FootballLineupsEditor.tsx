"use client";

import type { Dispatch, SetStateAction } from "react";
import { useLayoutEffect, useMemo } from "react";
import type { GeneratedContent, SceneSpec } from "@/types";
import { footballMatchCodeFromNames } from "@/app/features/content/content-generator";
import {
  PREMIER_LEAGUE_TEAMS,
  getPremierLeagueTeamById,
  toColorInputValue,
} from "@/app/features/editor/premier-league-teams";

const btnGhostSm =
  "rounded border border-[#1f2d26] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[#1a2620] transition disabled:opacity-40";

const SCENE_LINEUP_HOME = "board-1-lineup-home";
const SCENE_LINEUP_AWAY = "board-1-lineup-away";
const SCENE_LINEUPS = [SCENE_LINEUP_HOME, SCENE_LINEUP_AWAY] as const;
const SCENE_SUBS = "board-2-subs";
const SCENE_INJ = "board-3-injuries";

/** Legacy single pitch → two half-pitch scenes (same data + lineupHalf). */
function migrateFootballLineupScenes(content: GeneratedContent): GeneratedContent {
  if (content.format !== "football-lineups") return content;
  if (content.scenes.some((s) => s.id === SCENE_LINEUP_HOME)) return content;
  const old = content.scenes.find((s) => s.id === "board-1-lineup");
  if (!old) return content;
  const data = { ...old.data };
  const homeScene: SceneSpec = {
    ...old,
    id: SCENE_LINEUP_HOME,
    captionLine: "Starting XI — home",
    data: { ...data, lineupHalf: "home" },
  };
  const awayScene: SceneSpec = {
    ...old,
    id: SCENE_LINEUP_AWAY,
    captionLine: "Starting XI — away",
    data: { ...data, lineupHalf: "away" },
  };
  const scenes = content.scenes.flatMap((s) =>
    s.id === "board-1-lineup" ? [homeScene, awayScene] : [s],
  );
  return { ...content, scenes };
}

type StarterRow = { n: number; name: string; x: number; y: number; gk?: boolean; surname?: string };
type BenchRow = { n: number; name: string; surname?: string; position?: string };
type InjuryRow = { n: number; name: string; surname?: string; detail: string };

function sceneById(content: GeneratedContent, id: string) {
  return content.scenes.find((s) => s.id === id);
}

function patchScene(
  content: GeneratedContent,
  sceneId: string,
  fn: (data: Record<string, unknown>) => Record<string, unknown>,
): GeneratedContent {
  return {
    ...content,
    scenes: content.scenes.map((s) =>
      s.id === sceneId ? { ...s, data: fn({ ...s.data }) } : s,
    ),
  };
}

/** Keep home/away labels and match code aligned on pitch, bench, and injuries scenes */
function syncTeamNames(
  content: GeneratedContent,
  homeName: string,
  awayName: string,
): GeneratedContent {
  const migrated = migrateFootballLineupScenes(content);
  const matchCodeLine = footballMatchCodeFromNames(homeName, awayName);
  const ids = new Set<string>([...SCENE_LINEUPS, SCENE_SUBS, SCENE_INJ]);
  return {
    ...migrated,
    scenes: migrated.scenes.map((s) =>
      ids.has(s.id)
        ? { ...s, data: { ...s.data, homeName, awayName, matchCodeLine } }
        : s,
    ),
  };
}

function patchFootballMeta(
  content: GeneratedContent,
  patch: Record<string, unknown>,
): GeneratedContent {
  const migrated = migrateFootballLineupScenes(content);
  const ids = new Set<string>([...SCENE_LINEUPS, SCENE_SUBS, SCENE_INJ]);
  return {
    ...migrated,
    scenes: migrated.scenes.map((s) =>
      ids.has(s.id) ? { ...s, data: { ...s.data, ...patch } } : s,
    ),
  };
}

function patchLineupScenes(
  content: GeneratedContent,
  fn: (d: Record<string, unknown>) => Record<string, unknown>,
): GeneratedContent {
  let next = migrateFootballLineupScenes(content);
  for (const id of SCENE_LINEUPS) {
    next = patchScene(next, id, fn);
  }
  return next;
}

const inputClass =
  "w-full rounded border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-sm text-white";
const selectClass = `${inputClass} cursor-pointer`;
const labelClass = "text-[10px] font-semibold uppercase tracking-wide text-slate-500";
const thClass = "text-left text-[10px] font-semibold uppercase text-slate-500 pb-1";

function BoardSceneHint({ sceneId, caption }: { sceneId: string; caption: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-mono text-[11px] text-[#eab308]">{sceneId}</span>
      <span className="text-xs text-slate-500">{caption}</span>
    </div>
  );
}

function KitColorFields({
  side,
  shirt,
  number,
  onShirt,
  onNumber,
}: {
  side: string;
  shirt: string;
  number: string;
  onShirt: (v: string) => void;
  onNumber: (v: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className={labelClass}>{side} shirt (pitch)</span>
        <div className="mt-1 flex gap-2 items-center">
          <input
            type="color"
            aria-label={`${side} shirt colour`}
            className="h-9 w-14 shrink-0 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
            value={toColorInputValue(shirt)}
            onChange={(e) => onShirt(e.target.value)}
          />
          <input
            type="text"
            className={inputClass}
            value={shirt}
            placeholder="#RRGGBB"
            spellCheck={false}
            onChange={(e) => onShirt(e.target.value)}
          />
        </div>
      </label>
      <label className="block">
        <span className={labelClass}>{side} numbers</span>
        <div className="mt-1 flex gap-2 items-center">
          <input
            type="color"
            aria-label={`${side} number colour`}
            className="h-9 w-14 shrink-0 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
            value={toColorInputValue(number)}
            onChange={(e) => onNumber(e.target.value)}
          />
          <input
            type="text"
            className={inputClass}
            value={number}
            placeholder="#RRGGBB"
            spellCheck={false}
            onChange={(e) => onNumber(e.target.value)}
          />
        </div>
      </label>
    </div>
  );
}

function HexColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="mt-1 flex gap-2 items-center">
        <input
          type="color"
          aria-label={label}
          className="h-9 w-14 shrink-0 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
          value={toColorInputValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className={inputClass}
          value={value}
          placeholder="#RRGGBB"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

function StarterTable({
  title,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  rows: StarterRow[];
  onChange: (next: StarterRow[]) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const setRow = (i: number, patch: Partial<StarterRow>) => {
    const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#22d3ee]">{title}</p>
        <button type="button" className={btnGhostSm} onClick={onAdd}>
          + Add player
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass} title="Under shirt; leave blank for last name">
                Surname
              </th>
              <th className={thClass}>X%</th>
              <th className={thClass}>Y%</th>
              <th className={thClass} title="Goalkeeper kit on pitch">
                GK
              </th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1f2d26]/80">
                <td className="py-1 pr-1 align-top">
                  <input
                    type="number"
                    className={`${inputClass} w-12`}
                    value={Number.isFinite(r.n) ? r.n : 0}
                    onChange={(e) => setRow(i, { n: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={inputClass}
                    value={r.name}
                    placeholder="Player name"
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={`${inputClass} min-w-[72px]`}
                    value={r.surname ?? ""}
                    placeholder="auto"
                    title="Pitch label under shirt; empty = last word of name"
                    onChange={(e) => setRow(i, { surname: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="number"
                    className={`${inputClass} w-14`}
                    value={r.x}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(e) => setRow(i, { x: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="number"
                    className={`${inputClass} w-14`}
                    value={r.y}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(e) => setRow(i, { y: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1 pr-1 align-middle text-center">
                  <input
                    type="checkbox"
                    checked={Boolean(r.gk)}
                    onChange={(e) => setRow(i, { gk: e.target.checked })}
                    title="Use goalkeeper shirt colour"
                    className="h-4 w-4 accent-[#22d3ee]"
                  />
                </td>
                <td className="py-1 align-top">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => onRemove(i)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BenchTable({
  title,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  rows: BenchRow[];
  onChange: (next: BenchRow[]) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const setRow = (i: number, patch: Partial<BenchRow>) => {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  return (
    <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#22d3ee]">{title}</p>
        <button type="button" className={btnGhostSm} onClick={onAdd}>
          + Add player
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Surname</th>
              <th className={thClass}>Pos</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1f2d26]/80">
                <td className="py-1 pr-1 align-top">
                  <input
                    type="number"
                    className={`${inputClass} w-12`}
                    value={Number.isFinite(r.n) ? r.n : 0}
                    onChange={(e) => setRow(i, { n: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={inputClass}
                    value={r.name}
                    placeholder="Player name"
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={`${inputClass} min-w-[68px]`}
                    value={r.surname ?? ""}
                    placeholder="auto"
                    title="Label on bench board"
                    onChange={(e) => setRow(i, { surname: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={`${inputClass} w-14`}
                    value={r.position ?? ""}
                    placeholder="GK"
                    title="Position (GK uses goalkeeper kit)"
                    onChange={(e) => setRow(i, { position: e.target.value })}
                  />
                </td>
                <td className="py-1 align-top">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => onRemove(i)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InjuryTable({
  title,
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  rows: InjuryRow[];
  onChange: (next: InjuryRow[]) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const setRow = (i: number, patch: Partial<InjuryRow>) => {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  return (
    <div className="rounded-lg border border-[#1f2d26] bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#22d3ee]">{title}</p>
        <button type="button" className={btnGhostSm} onClick={onAdd}>
          + Add player
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Surname</th>
              <th className={thClass}>Detail</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1f2d26]/80">
                <td className="py-1 pr-1 align-top">
                  <input
                    type="number"
                    className={`${inputClass} w-12`}
                    value={Number.isFinite(r.n) ? r.n : 0}
                    title="Shirt number on injuries board (0 = hide number)"
                    onChange={(e) => setRow(i, { n: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={inputClass}
                    value={r.name}
                    placeholder="Player name"
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={`${inputClass} min-w-[68px]`}
                    value={r.surname ?? ""}
                    placeholder="auto"
                    onChange={(e) => setRow(i, { surname: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-1 align-top">
                  <input
                    type="text"
                    className={inputClass}
                    value={r.detail}
                    placeholder="Status / detail"
                    onChange={(e) => setRow(i, { detail: e.target.value })}
                  />
                </td>
                <td className="py-1 align-top">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => onRemove(i)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseStarters(raw: unknown): StarterRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      n: typeof o.n === "number" ? o.n : Number(o.n) || 0,
      name: String(o.name ?? ""),
      x: typeof o.x === "number" ? o.x : Number(o.x) || 50,
      y: typeof o.y === "number" ? o.y : Number(o.y) || 50,
      gk: o.gk === true,
      surname: String(o.surname ?? "").trim(),
    };
  });
}

function parseBench(raw: unknown): BenchRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      n: typeof o.n === "number" ? o.n : Number(o.n) || 0,
      name: String(o.name ?? ""),
      surname: String(o.surname ?? "").trim(),
      position: String(o.position ?? "").trim(),
    };
  });
}

function parseInjuries(raw: unknown): InjuryRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    const nRaw = typeof o.n === "number" ? o.n : Number(o.n);
    return {
      n: Number.isFinite(nRaw) ? nRaw : 0,
      name: String(o.name ?? ""),
      surname: String(o.surname ?? "").trim(),
      detail: String(o.detail ?? ""),
    };
  });
}

export function FootballLineupsEditor({
  content,
  setContent,
}: {
  content: GeneratedContent;
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>;
}) {
  const working = useMemo(() => migrateFootballLineupScenes(content), [content]);
  useLayoutEffect(() => {
    if (content.format !== "football-lineups") return;
    if (working !== content) setContent(working);
  }, [working, content, setContent]);

  if (content.format !== "football-lineups") return null;

  const s1h = sceneById(working, SCENE_LINEUP_HOME);
  const s1a = sceneById(working, SCENE_LINEUP_AWAY);
  const s2 = sceneById(working, SCENE_SUBS);
  const s3 = sceneById(working, SCENE_INJ);
  if (!s1h || !s1a || !s2 || !s3) return null;

  const d1 = s1h.data;
  const homeName = String(d1.homeName ?? "");
  const awayName = String(d1.awayName ?? "");
  const league = String(d1.league ?? "");
  const matchDate = String(d1.matchDate ?? "");
  const kickoff = String(d1.kickoff ?? "");
  const homeFormation = String(d1.homeFormation ?? "");
  const awayFormation = String(d1.awayFormation ?? "");
  const homeShirtColor = String(d1.homeShirtColor ?? "#c41e2a");
  const awayShirtColor = String(d1.awayShirtColor ?? "#f8fafc");
  const homeNumberColor = String(d1.homeNumberColor ?? "#ffffff");
  const awayNumberColor = String(d1.awayNumberColor ?? "#0f172a");
  const homeSleeveColor = String(d1.homeSleeveColor ?? "#f8fafc");
  const awaySleeveColor = String(d1.awaySleeveColor ?? "#f8fafc");
  const homeGkShirtColor = String(d1.homeGkShirtColor ?? "#4ade80");
  const awayGkShirtColor = String(d1.awayGkShirtColor ?? "#a855f7");

  const homePresetId = PREMIER_LEAGUE_TEAMS.find((t) => t.name === homeName)?.id ?? "";
  const awayPresetId = PREMIER_LEAGUE_TEAMS.find((t) => t.name === awayName)?.id ?? "";

  const homeStarters = parseStarters(d1.homeStarters);
  const awayStarters = parseStarters(d1.awayStarters);
  const homeBench = parseBench(s2.data.homeBench);
  const awayBench = parseBench(s2.data.awayBench);
  const homeInjuries = parseInjuries(s3.data.homeInjuries);
  const awayInjuries = parseInjuries(s3.data.awayInjuries);

  const setLineup = (fn: (d: Record<string, unknown>) => Record<string, unknown>) => {
    setContent((c) => (c ? patchLineupScenes(c, fn) : c));
  };

  const setSubs = (fn: (d: Record<string, unknown>) => Record<string, unknown>) => {
    setContent((c) => (c ? patchScene(c, SCENE_SUBS, fn) : c));
  };

  const setInj = (fn: (d: Record<string, unknown>) => Record<string, unknown>) => {
    setContent((c) => (c ? patchScene(c, SCENE_INJ, fn) : c));
  };

  const applyHomePreset = (id: string) => {
    if (!id) return;
    const t = getPremierLeagueTeamById(id);
    if (!t) return;
    setContent((c) => {
      if (!c) return c;
      const away = String(sceneById(migrateFootballLineupScenes(c), SCENE_LINEUP_HOME)?.data.awayName ?? "");
      let next = syncTeamNames(c, t.name, away);
      next = patchLineupScenes(next, (d) => ({
        ...d,
        homeShirtColor: t.shirtColor,
        homeNumberColor: t.numberColor,
      }));
      return next;
    });
  };

  const applyAwayPreset = (id: string) => {
    if (!id) return;
    const t = getPremierLeagueTeamById(id);
    if (!t) return;
    setContent((c) => {
      if (!c) return c;
      const home = String(sceneById(migrateFootballLineupScenes(c), SCENE_LINEUP_HOME)?.data.homeName ?? "");
      let next = syncTeamNames(c, home, t.name);
      next = patchLineupScenes(next, (d) => ({
        ...d,
        awayShirtColor: t.shirtColor,
        awayNumberColor: t.numberColor,
      }));
      return next;
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-cyan-900/40 bg-[#0a1218] p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#22d3ee]">Football roster</p>
        <p className="mt-1 text-xs text-slate-500">
          Pick Premier League clubs to set names and kit colours, or choose Custom and type any club.
          Add or edit players on each board. Re-render scenes after changes — names sync across pitch,
          bench, and injuries frames.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>League</span>
          <input
            type="text"
            className={`${inputClass} mt-1`}
            value={league}
            onChange={(e) =>
              setContent((c) =>
                c ? patchFootballMeta(c, { league: e.target.value }) : c,
              )
            }
          />
        </label>
        <label className="block">
          <span className={labelClass}>Match date</span>
          <input
            type="text"
            className={`${inputClass} mt-1`}
            value={matchDate}
            onChange={(e) =>
              setContent((c) =>
                c ? patchFootballMeta(c, { matchDate: e.target.value }) : c,
              )
            }
          />
        </label>
        <label className="block">
          <span className={labelClass}>Kick-off</span>
          <input
            type="text"
            className={`${inputClass} mt-1`}
            value={kickoff}
            onChange={(e) =>
              setContent((c) =>
                c ? patchFootballMeta(c, { kickoff: e.target.value }) : c,
              )
            }
          />
        </label>
      </div>

      <div className="rounded-lg border border-[#1f2d26] bg-black/30 p-3 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Premier League clubs &amp; kit colours
        </p>
        <p className="text-[11px] text-slate-600">
          Selecting a club sets the display name on every board and default shirt colours on the pitch
          (board 1). You can still edit names and hex values afterwards.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className={labelClass}>Home — Premier League</span>
              <select
                className={`${selectClass} mt-1`}
                value={homePresetId}
                onChange={(e) => applyHomePreset(e.target.value)}
              >
                <option value="">Custom / other league</option>
                {PREMIER_LEAGUE_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Home — display name</span>
              <input
                type="text"
                className={`${inputClass} mt-1`}
                value={homeName}
                onChange={(e) =>
                  setContent((c) => (c ? syncTeamNames(c, e.target.value, awayName) : c))
                }
              />
            </label>
            <KitColorFields
              side="Home"
              shirt={homeShirtColor}
              number={homeNumberColor}
              onShirt={(v) => setLineup((d) => ({ ...d, homeShirtColor: v }))}
              onNumber={(v) => setLineup((d) => ({ ...d, homeNumberColor: v }))}
            />
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className={labelClass}>Away — Premier League</span>
              <select
                className={`${selectClass} mt-1`}
                value={awayPresetId}
                onChange={(e) => applyAwayPreset(e.target.value)}
              >
                <option value="">Custom / other league</option>
                {PREMIER_LEAGUE_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Away — display name</span>
              <input
                type="text"
                className={`${inputClass} mt-1`}
                value={awayName}
                onChange={(e) =>
                  setContent((c) => (c ? syncTeamNames(c, homeName, e.target.value) : c))
                }
              />
            </label>
            <KitColorFields
              side="Away"
              shirt={awayShirtColor}
              number={awayNumberColor}
              onShirt={(v) => setLineup((d) => ({ ...d, awayShirtColor: v }))}
              onNumber={(v) => setLineup((d) => ({ ...d, awayNumberColor: v }))}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-600 pt-1">
          Jersey SVG uses sleeve trim and a distinct GK body colour when a player has GK checked (pitch
          boards).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HexColorRow
            label="Home sleeves / trim"
            value={homeSleeveColor}
            onChange={(v) => setLineup((d) => ({ ...d, homeSleeveColor: v }))}
          />
          <HexColorRow
            label="Away sleeves / trim"
            value={awaySleeveColor}
            onChange={(v) => setLineup((d) => ({ ...d, awaySleeveColor: v }))}
          />
          <HexColorRow
            label="Home GK shirt"
            value={homeGkShirtColor}
            onChange={(v) => setLineup((d) => ({ ...d, homeGkShirtColor: v }))}
          />
          <HexColorRow
            label="Away GK shirt"
            value={awayGkShirtColor}
            onChange={(v) => setLineup((d) => ({ ...d, awayGkShirtColor: v }))}
          />
        </div>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Home formation</span>
          <input
            type="text"
            className={`${inputClass} mt-1`}
            value={homeFormation}
            placeholder="e.g. 4-2-3-1"
            onChange={(e) =>
              setLineup((d) => ({ ...d, homeFormation: e.target.value }))
            }
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Away formation</span>
          <input
            type="text"
            className={`${inputClass} mt-1`}
            value={awayFormation}
            onChange={(e) =>
              setLineup((d) => ({ ...d, awayFormation: e.target.value }))
            }
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">Board 1 — Line-ups (home &amp; away)</p>
        <BoardSceneHint
          sceneId={SCENE_LINEUP_HOME}
          caption="Half-pitch — home XI only. Same data as away board; render produces two PNGs."
        />
        <BoardSceneHint sceneId={SCENE_LINEUP_AWAY} caption="Half-pitch — away XI only." />
        <div className="grid gap-3 lg:grid-cols-2">
          <StarterTable
            title="Home starters"
            rows={homeStarters}
            onChange={(next) => setLineup((d) => ({ ...d, homeStarters: next }))}
            onAdd={() =>
              setLineup((d) => ({
                ...d,
                homeStarters: [
                  ...parseStarters(d.homeStarters),
                  { n: 0, name: "", surname: "", x: 50, y: 50, gk: false },
                ],
              }))
            }
            onRemove={(i) =>
              setLineup((d) => ({
                ...d,
                homeStarters: parseStarters(d.homeStarters).filter((_, j) => j !== i),
              }))
            }
          />
          <StarterTable
            title="Away starters"
            rows={awayStarters}
            onChange={(next) => setLineup((d) => ({ ...d, awayStarters: next }))}
            onAdd={() =>
              setLineup((d) => ({
                ...d,
                awayStarters: [
                  ...parseStarters(d.awayStarters),
                  { n: 0, name: "", surname: "", x: 50, y: 50, gk: false },
                ],
              }))
            }
            onRemove={(i) =>
              setLineup((d) => ({
                ...d,
                awayStarters: parseStarters(d.awayStarters).filter((_, j) => j !== i),
              }))
            }
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">Board 2 — Bench</p>
        <BoardSceneHint sceneId={SCENE_SUBS} caption="Bench players — add or edit squad numbers and names." />
        <div className="grid gap-3 lg:grid-cols-2">
          <BenchTable
            title="Home bench"
            rows={homeBench}
            onChange={(next) => setSubs((d) => ({ ...d, homeBench: next }))}
            onAdd={() =>
              setSubs((d) => ({
                ...d,
                homeBench: [...parseBench(d.homeBench), { n: 0, name: "", surname: "", position: "" }],
              }))
            }
            onRemove={(i) =>
              setSubs((d) => ({
                ...d,
                homeBench: parseBench(d.homeBench).filter((_, j) => j !== i),
              }))
            }
          />
          <BenchTable
            title="Away bench"
            rows={awayBench}
            onChange={(next) => setSubs((d) => ({ ...d, awayBench: next }))}
            onAdd={() =>
              setSubs((d) => ({
                ...d,
                awayBench: [...parseBench(d.awayBench), { n: 0, name: "", surname: "", position: "" }],
              }))
            }
            onRemove={(i) =>
              setSubs((d) => ({
                ...d,
                awayBench: parseBench(d.awayBench).filter((_, j) => j !== i),
              }))
            }
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">Board 3 — Injuries &amp; suspensions</p>
        <BoardSceneHint
          sceneId={SCENE_INJ}
          caption="Injuries & suspensions — add rows or edit player and status text."
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <InjuryTable
            title="Home"
            rows={homeInjuries}
            onChange={(next) => setInj((d) => ({ ...d, homeInjuries: next }))}
            onAdd={() =>
              setInj((d) => ({
                ...d,
                homeInjuries: [
                  ...parseInjuries(d.homeInjuries),
                  { n: 0, name: "", surname: "", detail: "" },
                ],
              }))
            }
            onRemove={(i) =>
              setInj((d) => ({
                ...d,
                homeInjuries: parseInjuries(d.homeInjuries).filter((_, j) => j !== i),
              }))
            }
          />
          <InjuryTable
            title="Away"
            rows={awayInjuries}
            onChange={(next) => setInj((d) => ({ ...d, awayInjuries: next }))}
            onAdd={() =>
              setInj((d) => ({
                ...d,
                awayInjuries: [
                  ...parseInjuries(d.awayInjuries),
                  { n: 0, name: "", surname: "", detail: "" },
                ],
              }))
            }
            onRemove={(i) =>
              setInj((d) => ({
                ...d,
                awayInjuries: parseInjuries(d.awayInjuries).filter((_, j) => j !== i),
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
