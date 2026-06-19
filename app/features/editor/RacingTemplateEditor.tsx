"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { EditorCollapsible } from "@/app/features/editor/EditorCollapsible";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { F1GridEditor } from "@/app/features/editor/F1GridEditor";
import { F1ResultsEditor } from "@/app/features/editor/F1ResultsEditor";
import { PlanetRugbyTableEditor } from "@/app/features/editor/PlanetRugbyTableEditor";
import { TeamtalkNewsEditor } from "@/app/features/editor/TeamtalkNewsEditor";
import { BRAND_MARK } from "@/app/lib/brand";
import { defaultSilksForIndex, SILK_PATTERN_OPTIONS } from "@/app/lib/silk-presets";
import type {
  FastIntroFieldAnimations,
  FastOutroFieldAnimations,
  FastPlacingsFieldAnimations,
  FastWinnerFieldAnimations,
  GeneratedContent,
  Movement,
  NextOffBundle,
  NextOffIntroFieldAnimations,
  NextOffOutroFieldAnimations,
  NextOffTipFieldAnimations,
  PlanetRugbyTableBundle,
  Placing,
  Race,
  RacecardSnapshot,
  RcBoardGridFieldAnimations,
  RcCtaFieldAnimations,
  RcIntroFieldAnimations,
  RcMoverFieldAnimations,
  Result,
  Runner,
  RunnerSilks,
  SilkPattern,
  TemplateFieldAnimation,
  TemplateFieldAnimPreset,
  TemplateSource,
  Tip,
} from "@/types";

const input =
  "w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-sm text-white";
const label = "block text-[10px] font-semibold uppercase tracking-wide text-slate-500";
/** Legible on light panels (e.g. system light theme) and on dark editor chrome. */
const hint = "text-xs leading-snug text-slate-700 dark:text-amber-100/90";
const hintStrong = "font-semibold text-slate-900 dark:text-slate-200";
const hintCode = "font-mono text-slate-800 dark:text-slate-400";

const ANIM_PRESETS: { value: TemplateFieldAnimPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade in" },
  { value: "slide-up", label: "Slide up" },
  { value: "slide-left", label: "Slide left" },
  { value: "zoom-in", label: "Zoom in" },
  { value: "pulse", label: "Pulse" },
];

function NextOffFieldAnimRow({
  fieldLabel,
  anim,
  onChange,
}: {
  fieldLabel: string;
  anim: TemplateFieldAnimation | undefined;
  onChange: (next: TemplateFieldAnimation | undefined) => void;
}) {
  const preset = anim?.preset ?? "none";
  const durationSec = anim?.durationSec ?? 0.7;
  const delaySec = anim?.delaySec ?? 0;
  const disabled = preset === "none";
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end rounded-md border border-[#1f2d26]/80 bg-black/20 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 col-span-2 sm:col-span-1">{fieldLabel}</p>
      <label className="block min-w-0">
        <span className="text-[9px] uppercase text-slate-600">Preset</span>
        <select
          className={`${input} mt-0.5 w-full`}
          value={preset}
          onChange={(e) => {
            const v = e.target.value as TemplateFieldAnimPreset;
            if (v === "none") onChange(undefined);
            else onChange({ preset: v, durationSec, delaySec });
          }}
        >
          {ANIM_PRESETS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="text-[9px] uppercase text-slate-600">Duration (s)</span>
        <input
          type="number"
          min={0.3}
          max={2}
          step={0.1}
          className={`${input} mt-0.5 w-full`}
          value={durationSec}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange({ preset: preset === "none" ? "fade-in" : preset, durationSec: n, delaySec });
          }}
        />
      </label>
      <label className="block min-w-0">
        <span className="text-[9px] uppercase text-slate-600">Delay (s)</span>
        <input
          type="number"
          min={0}
          max={2}
          step={0.05}
          className={`${input} mt-0.5 w-full`}
          value={delaySec}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange({ preset: preset === "none" ? "fade-in" : preset, durationSec, delaySec: n });
          }}
        />
      </label>
    </div>
  );
}

function commitTemplate(
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>,
  prev: GeneratedContent | null,
  source: TemplateSource,
  onAfter?: () => void,
) {
  setContent(applyTemplateWithPreferences(prev, source));
  onAfter?.();
}

function syncTipsRace(b: NextOffBundle): NextOffBundle {
  return { ...b, tips: b.tips.map((t) => ({ ...t, race: b.race })) };
}

function padTips(b: NextOffBundle): Tip[] {
  const tips = [...b.tips];
  while (tips.length < 3) {
    tips.push({
      horse: "",
      odds: "",
      stars: 0,
      race: b.race,
      silks: defaultSilksForIndex(tips.length),
    });
  }
  return tips.slice(0, 3).map((t, i) => ({
    ...t,
    silks: t.silks ?? defaultSilksForIndex(i),
  }));
}

function padPlacings(r: Result): Placing[] {
  const p = [...r.placings];
  while (p.length < 4) {
    p.push({
      position: p.length + 1,
      horse: "",
      sp: "",
      silks: defaultSilksForIndex(p.length),
    });
  }
  return p.slice(0, 4).map((pl, i) => ({
    ...pl,
    silks: pl.silks ?? defaultSilksForIndex(i),
  }));
}

function emptyRunner(n: number, idx: number): Runner {
  return { number: n, horse: "", odds: "", silks: defaultSilksForIndex(idx) };
}

function pickHex(v: string | undefined, fb: string): string {
  const t = (v ?? "").trim();
  return /^#([0-9A-Fa-f]{6})$/i.test(t) ? t : fb;
}

const MOVEMENTS: Movement[] = ["steady", "backed", "drift", "unknown"];

/** Re-use the same silk image URL / Timeform code across horses without re-typing (sessionStorage). */
const SILK_CLIPBOARD_STORAGE_KEY = "r365-silk-feed-clipboard";

type SilkClipboardPayload = {
  imageUrl?: string;
  silkCode?: string;
  imageAspectRatio?: number;
};

function readSilkClipboard(): SilkClipboardPayload | null {
  try {
    const raw = sessionStorage.getItem(SILK_CLIPBOARD_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    return p as SilkClipboardPayload;
  } catch {
    return null;
  }
}

function writeSilkClipboard(payload: SilkClipboardPayload) {
  try {
    const pruned: SilkClipboardPayload = {};
    if (payload.imageUrl?.trim()) pruned.imageUrl = payload.imageUrl.trim();
    if (payload.silkCode?.trim()) pruned.silkCode = payload.silkCode.trim();
    if (typeof payload.imageAspectRatio === "number" && Number.isFinite(payload.imageAspectRatio)) {
      pruned.imageAspectRatio = payload.imageAspectRatio;
    }
    if (Object.keys(pruned).length === 0) sessionStorage.removeItem(SILK_CLIPBOARD_STORAGE_KEY);
    else sessionStorage.setItem(SILK_CLIPBOARD_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    /* quota / private mode */
  }
}

/** When URL or code is set, merge into the shared clipboard (used on blur + explicit Remember). */
function rememberSilkFeedFields(s: RunnerSilks) {
  const imageUrl = s.imageUrl?.trim();
  const silkCode = s.silkCode?.trim();
  const prev = readSilkClipboard() ?? {};
  if (!imageUrl && !silkCode) return false;
  writeSilkClipboard({
    ...prev,
    ...(imageUrl ? { imageUrl } : {}),
    ...(silkCode ? { silkCode } : {}),
    ...(typeof s.imageAspectRatio === "number" && Number.isFinite(s.imageAspectRatio)
      ? { imageAspectRatio: s.imageAspectRatio }
      : {}),
  });
  return true;
}

/** Full-width Save at the bottom of each horse card — updates silk clipboard + browser template draft. */
function HorseCardSaveBar({
  silk,
  onSaveBrowserDraft,
  className = "",
}: {
  silk: RunnerSilks;
  onSaveBrowserDraft?: () => void;
  className?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (!onSaveBrowserDraft) return null;

  return (
    <div className={`mt-3 space-y-2 border-t border-[#1f2d26] pt-3 ${className}`}>
      <button
        type="button"
        className="w-full rounded-lg border border-[#22c55e]/55 bg-[#14532d]/35 px-3 py-2.5 text-sm font-bold tracking-wide text-[#86efac] hover:bg-[#14532d]/55"
        onClick={() => {
          rememberSilkFeedFields(silk);
          onSaveBrowserDraft();
          setMsg("Saved — template stored in this browser. Use Apply saved on another row to copy this URL/code.");
        }}
      >
        Save
      </button>
      {msg && <p className="text-center text-[11px] leading-snug text-[#22c55e]">{msg}</p>}
    </div>
  );
}

function SilkEditor({
  silk,
  onPatch,
  onSaveBrowserDraft,
  className = "col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-5",
}: {
  silk: RunnerSilks;
  onPatch: (patch: Partial<RunnerSilks>) => void;
  /** Same as “Save template” in the browser draft panel — persists full template including silks. */
  onSaveBrowserDraft?: () => void;
  className?: string;
}) {
  const [silkActionMsg, setSilkActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!silkActionMsg) return;
    const t = window.setTimeout(() => setSilkActionMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [silkActionMsg]);

  return (
    <div className={className}>
      <label className={label}>
        Pattern
        <select
          className={`${input} mt-1`}
          value={silk.pattern ?? "halves"}
          onChange={(e) => onPatch({ pattern: e.target.value as SilkPattern })}
        >
          {SILK_PATTERN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Body
        <div className="mt-1 flex gap-1">
          <input
            type="color"
            className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
            value={pickHex(silk.body ?? "", "#444444")}
            onChange={(e) => onPatch({ body: e.target.value })}
          />
          <input
            className={`${input} min-w-0 flex-1 font-mono text-xs`}
            value={silk.body ?? ""}
            onChange={(e) => onPatch({ body: e.target.value })}
          />
        </div>
      </label>
      <label className={label}>
        Secondary
        <div className="mt-1 flex gap-1">
          <input
            type="color"
            className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
            value={pickHex(silk.secondary, pickHex(silk.body ?? "", "#888888"))}
            onChange={(e) => onPatch({ secondary: e.target.value })}
          />
          <input
            className={`${input} min-w-0 flex-1 font-mono text-xs`}
            value={silk.secondary ?? ""}
            placeholder="optional"
            onChange={(e) => onPatch({ secondary: e.target.value || undefined })}
          />
        </div>
      </label>
      <label className={label}>
        Cap
        <div className="mt-1 flex gap-1">
          <input
            type="color"
            className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
            value={pickHex(silk.cap, "#f8fafc")}
            onChange={(e) => onPatch({ cap: e.target.value })}
          />
          <input
            className={`${input} min-w-0 flex-1 font-mono text-xs`}
            value={silk.cap ?? ""}
            placeholder="optional"
            onChange={(e) => onPatch({ cap: e.target.value || undefined })}
          />
        </div>
      </label>
      <label className={label}>
        Accent
        <div className="mt-1 flex gap-1">
          <input
            type="color"
            className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
            value={pickHex(silk.accent, "#ffffff")}
            onChange={(e) => onPatch({ accent: e.target.value })}
          />
          <input
            className={`${input} min-w-0 flex-1 font-mono text-xs`}
            value={silk.accent ?? ""}
            placeholder="bands / collar"
            onChange={(e) => onPatch({ accent: e.target.value || undefined })}
          />
        </div>
      </label>
      <div className="col-span-2 space-y-2 border-t border-[#1f2d26] pt-3 sm:col-span-5">
        <p className={hint}>
          <strong className={hintStrong}>No image?</strong> Colours drive the shirt-and-cap SVG (pick a style
          above). <strong className={hintStrong}>With image:</strong> Timeform code or URL wins — use your CDN,
          or this app&apos;s proxy{" "}
          <code className={hintCode}>/api/silk-image?url=…</code> (allowlist in{" "}
          <code className={hintCode}>.env</code>). Silks live in your template JSON —{" "}
          <strong className={hintStrong}>Save template to disk</strong> (tpl-…) for{" "}
          <code className={hintCode}>data/local/user-templates.json</code>.{" "}
          <strong className={hintStrong}>Remember / Apply saved</strong> reuses the same URL or Timeform code
          across horses; leaving the URL or code field also updates that clipboard on blur. Use{" "}
          <strong className={hintStrong}>Save draft</strong> to persist the whole template in this browser.
        </p>
        <label className={label}>
          Timeform silk code (per horse)
          <input
            className={`${input} mt-1 font-mono text-xs`}
            value={silk.silkCode ?? ""}
            placeholder="e.g. 00887104"
            onChange={(e) => onPatch({ silkCode: e.target.value.trim() || undefined })}
            onBlur={(e) => {
              const code = e.currentTarget.value.trim();
              rememberSilkFeedFields({ ...silk, silkCode: code || undefined });
            }}
          />
        </label>
        <label className={label}>
          Silk image URL (overrides code)
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            className={`${input} mt-1 font-mono text-xs`}
            value={silk.imageUrl ?? ""}
            placeholder="/api/silk-image?url=… or https://…"
            onChange={(e) => onPatch({ imageUrl: e.target.value.trim() || undefined })}
            onBlur={(e) => {
              const url = e.currentTarget.value.trim();
              rememberSilkFeedFields({ ...silk, imageUrl: url || undefined });
            }}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <label className={label}>
            Aspect W÷H
            <input
              type="number"
              step="0.02"
              min="0.3"
              max="1.5"
              className={`${input} mt-1 w-28 font-mono text-xs`}
              value={silk.imageAspectRatio ?? ""}
              placeholder="0.78"
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onPatch({ imageAspectRatio: undefined });
                  return;
                }
                const n = Number(v);
                onPatch({ imageAspectRatio: Number.isFinite(n) ? n : undefined });
              }}
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-[#1f2d26] bg-[#121a16] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#1a2620]"
            onClick={() => {
              if (!rememberSilkFeedFields(silk)) {
                setSilkActionMsg("Add a URL or Timeform code first, then click Remember.");
                return;
              }
              setSilkActionMsg("Remembered — open another horse and click Apply saved.");
            }}
          >
            Remember URL &amp; code
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#1f2d26] bg-[#121a16] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#1a2620]"
            onClick={() => {
              const clip = readSilkClipboard();
              if (!clip?.imageUrl && !clip?.silkCode) {
                setSilkActionMsg("Nothing saved yet — use Remember or leave the URL field (auto-saves on blur).");
                return;
              }
              onPatch({
                ...(clip.imageUrl ? { imageUrl: clip.imageUrl } : {}),
                ...(clip.silkCode ? { silkCode: clip.silkCode } : {}),
                ...(typeof clip.imageAspectRatio === "number" ? { imageAspectRatio: clip.imageAspectRatio } : {}),
              });
              setSilkActionMsg("Applied saved silk feed fields to this row.");
            }}
          >
            Apply saved
          </button>
          {onSaveBrowserDraft && (
            <button
              type="button"
              className="rounded-lg border border-[#22c55e]/40 bg-[#14532d]/25 px-3 py-1.5 text-xs font-semibold text-[#86efac] hover:bg-[#14532d]/45"
              onClick={() => {
                onSaveBrowserDraft();
                setSilkActionMsg("Template draft saved in this browser (all fields).");
              }}
            >
              Save draft
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-[#1f2d26] bg-[#121a16] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#1a2620]"
            onClick={() => onPatch({ imageUrl: undefined, imageAspectRatio: undefined, silkCode: undefined })}
          >
            Clear image / code — use procedural
          </button>
        </div>
        {silkActionMsg && <p className="text-[11px] text-[#22c55e]">{silkActionMsg}</p>}
      </div>
    </div>
  );
}

function MoverSilkRow({
  mover,
  setMover,
  onSaveBrowserDraft,
}: {
  mover: Runner;
  setMover: (patch: Partial<Runner>) => void;
  onSaveBrowserDraft?: () => void;
}) {
  const silk = mover.silks ?? defaultSilksForIndex(0);
  const patchSilk = (patch: Partial<RunnerSilks>) =>
    setMover({ silks: { ...silk, ...patch } });
  return <SilkEditor silk={silk} onPatch={patchSilk} onSaveBrowserDraft={onSaveBrowserDraft} />;
}

type Props = {
  content: GeneratedContent;
  contentId: string;
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>;
  /** Called after template JSON changes (silks, placings, etc.) so PNG previews can be cleared. */
  onAfterTemplateCommit?: () => void;
  /** Wired to the browser “Save template” draft (full JSON, not just silks). */
  onSaveBrowserDraft?: () => void;
  /** Strip collapsible chrome when nested in editor tab panels. */
  templateSectionUnstyled?: boolean;
};

export function RacingTemplateEditor({
  content,
  contentId,
  setContent,
  onAfterTemplateCommit,
  onSaveBrowserDraft,
  templateSectionUnstyled = false,
}: Props) {
  const src = content.templateSource;
  if (!src || src.format === "football-lineups" || src.format === "team-line-up" || src.format === "team-sheet" || src.format === "score-line") {
    return null;
  }

  if (src.format === "teamtalk-news") {
    return (
      <TeamtalkNewsEditor
        bundle={src.bundle}
        content={content}
        setContent={setContent}
        onAfterTemplateCommit={onAfterTemplateCommit}
        templateSectionUnstyled={templateSectionUnstyled}
      />
    );
  }

  if (src.format === "f1-grid") {
    return (
      <F1GridEditor
        bundle={src.bundle}
        content={content}
        setContent={setContent}
        onAfterTemplateCommit={onAfterTemplateCommit}
        templateSectionUnstyled={templateSectionUnstyled}
      />
    );
  }

  if (src.format === "f1-results") {
    return (
      <F1ResultsEditor
        bundle={src.bundle}
        content={content}
        setContent={setContent}
        onAfterTemplateCommit={onAfterTemplateCommit}
        templateSectionUnstyled={templateSectionUnstyled}
      />
    );
  }

  if (src.format === "planet-rugby-table") {
    return (
      <PlanetRugbyTableEditor
        bundle={src.bundle}
        content={content}
        setContent={setContent}
        onAfterTemplateCommit={onAfterTemplateCommit}
        onSaveBrowserDraft={onSaveBrowserDraft}
        templateSectionUnstyled={templateSectionUnstyled}
      />
    );
  }

  if (src.format === "planet-football-table") {
    return (
      <PlanetRugbyTableEditor
        bundle={src.bundle as unknown as PlanetRugbyTableBundle}
        content={content}
        setContent={setContent}
        onAfterTemplateCommit={onAfterTemplateCommit}
        onSaveBrowserDraft={onSaveBrowserDraft}
        templateSectionUnstyled={templateSectionUnstyled}
        brand="football"
      />
    );
  }

  if (src.format === "next-off") {
    const b = src.bundle;
    const tips = padTips(b);
    const race = b.race;

    const push = (next: NextOffBundle) => {
      commitTemplate(setContent, content, { format: "next-off", bundle: syncTipsRace(next) }, onAfterTemplateCommit);
    };

    const setRace = (patch: Partial<Race>) => {
      const nextRace = { ...race, ...patch };
      push({ ...b, race: nextRace, tips: b.tips.map((t) => ({ ...t, race: nextRace })) });
    };

    const setTip = (i: number, patch: Partial<Tip>) => {
      const nextTips = tips.map((t, j) => (j === i ? { ...t, ...patch, race } : t));
      push({ ...b, tips: nextTips });
    };

    const setIntroFieldAnim = (field: keyof NextOffIntroFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      push({
        ...b,
        sceneAnimations: {
          ...b.sceneAnimations,
          intro: { ...b.sceneAnimations?.intro, [field]: anim },
        },
      });
    };

    const setTipFieldAnim = (tipIndex: number, field: keyof NextOffTipFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      const key = `tip${tipIndex + 1}` as "tip1" | "tip2" | "tip3";
      push({
        ...b,
        sceneAnimations: {
          ...b.sceneAnimations,
          [key]: { ...b.sceneAnimations?.[key], [field]: anim },
        },
      });
    };

    const setOutroFieldAnim = (field: keyof NextOffOutroFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      push({
        ...b,
        sceneAnimations: {
          ...b.sceneAnimations,
          outro: { ...b.sceneAnimations?.outro, [field]: anim },
        },
      });
    };

    return (
      <EditorCollapsible title="Template data — Next off" unstyled={templateSectionUnstyled}>
        <p className={`mb-3 ${hint}`}>
          Edit fields below, then <strong className="text-[#eab308]">Render scenes</strong> to refresh
          PNGs. Voice and headline overrides in Edit controls still apply after regenerate from feed.
        </p>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#22d3ee]">Race</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={label}>
              Course
              <input className={`${input} mt-1`} value={race.course} onChange={(e) => setRace({ course: e.target.value })} />
            </label>
            <label className={label}>
              Time
              <input className={`${input} mt-1`} value={race.raceTime} onChange={(e) => setRace({ raceTime: e.target.value })} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Title
              <input className={`${input} mt-1`} value={race.title} onChange={(e) => setRace({ title: e.target.value })} />
            </label>
            <label className={label}>
              Distance
              <input className={`${input} mt-1`} value={race.distance} onChange={(e) => setRace({ distance: e.target.value })} />
            </label>
            <label className={label}>
              Going
              <input className={`${input} mt-1`} value={race.going} onChange={(e) => setRace({ going: e.target.value })} />
            </label>
            <label className={label}>
              Runners #
              <input
                type="number"
                className={`${input} mt-1`}
                value={race.runnersCount}
                onChange={(e) => setRace({ runnersCount: Number(e.target.value) || 0 })}
              />
            </label>
            <label className={label}>
              Race id
              <input className={`${input} mt-1`} value={race.id} onChange={(e) => setRace({ id: e.target.value })} />
            </label>
          </div>
          <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Animation — race (intro frame)
            </summary>
            <p className={`${hint} mt-2 text-[11px]`}>
              Motion for the fields above as they appear on the <strong className="text-slate-400">first</strong> scene (course, time, going, title, distance · runners).{" "}
              <strong className="text-slate-400">Render scenes</strong> to refresh PNGs.
            </p>
            <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
              <NextOffFieldAnimRow
                fieldLabel="Course"
                anim={b.sceneAnimations?.intro?.course}
                onChange={(next) => setIntroFieldAnim("course", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Time"
                anim={b.sceneAnimations?.intro?.raceTime}
                onChange={(next) => setIntroFieldAnim("raceTime", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Title"
                anim={b.sceneAnimations?.intro?.title}
                onChange={(next) => setIntroFieldAnim("title", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Distance"
                anim={b.sceneAnimations?.intro?.distance}
                onChange={(next) => setIntroFieldAnim("distance", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Going"
                anim={b.sceneAnimations?.intro?.going}
                onChange={(next) => setIntroFieldAnim("going", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Runners #"
                anim={b.sceneAnimations?.intro?.runnersCount}
                onChange={(next) => setIntroFieldAnim("runnersCount", next)}
              />
            </div>
          </details>
        </div>
        <div className="mt-4 space-y-3 border-t border-[#1f2d26] pt-4">
          <p className="text-xs font-semibold text-[#22d3ee]">Intro slide</p>
          <p className={`${hint} text-[11px]`}>
            Top label on the first frame (e.g. NEXT OFF). Course, time, and title come from Race above.
          </p>
          <label className={label}>
            Intro kicker
            <input
              className={`${input} mt-1`}
              value={b.introKicker ?? ""}
              placeholder="Next off"
              onChange={(e) => push({ ...b, introKicker: e.target.value })}
            />
          </label>
          <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Animation — intro kicker
            </summary>
            <p className={`${hint} mt-2 text-[11px]`}>
              Only the label edited in this block. Race copy animates under <strong className="text-slate-400">Race → Animation — race (intro frame)</strong>.{" "}
              <strong className="text-slate-400">Render scenes</strong> to refresh PNGs.
            </p>
            <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
              <NextOffFieldAnimRow
                fieldLabel="Intro kicker"
                anim={b.sceneAnimations?.intro?.introKicker}
                onChange={(next) => setIntroFieldAnim("introKicker", next)}
              />
            </div>
          </details>
        </div>
        <div className="mt-4 space-y-3 border-t border-[#1f2d26] pt-4">
          <p className="text-xs font-semibold text-[#22d3ee]">Tips (three cards)</p>
          <p className={`${hint} text-[11px]`}>
            Silks appear on each tip scene, social card rows, and the Next off list page.
          </p>
          {tips.map((t, i) => {
            const silk = t.silks ?? defaultSilksForIndex(i);
            const tipKey = `tip${i + 1}` as "tip1" | "tip2" | "tip3";
            const tipAnim = b.sceneAnimations?.[tipKey];
            return (
              <div key={i} className="rounded-lg border border-[#1f2d26] bg-black/30 p-3 space-y-2">
                <p className="text-[10px] font-mono text-[#eab308]">Tip {i + 1}</p>
                <label className={label}>
                  Scene kicker
                  <input
                    className={`${input} mt-1`}
                    value={t.kicker ?? ""}
                    placeholder={`Tip ${i + 1}`}
                    onChange={(e) => setTip(i, { kicker: e.target.value })}
                  />
                </label>
                <label className={label}>
                  Horse
                  <input className={`${input} mt-1`} value={t.horse} onChange={(e) => setTip(i, { horse: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={label}>
                    Odds
                    <input className={`${input} mt-1`} value={t.odds} onChange={(e) => setTip(i, { odds: e.target.value })} />
                  </label>
                  <label className={label}>
                    Stars
                    <input
                      type="number"
                      min={0}
                      max={5}
                      className={`${input} mt-1`}
                      value={t.stars}
                      onChange={(e) => setTip(i, { stars: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>
                <p className={`${label} !mt-2`}>Silks</p>
                <SilkEditor
                  silk={silk}
                  onPatch={(patch) => setTip(i, { silks: { ...silk, ...patch } })}
                  onSaveBrowserDraft={onSaveBrowserDraft}
                />
                <HorseCardSaveBar silk={silk} onSaveBrowserDraft={onSaveBrowserDraft} />
                <details className="mt-2 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
                  <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Animation — tip {i + 1}
                  </summary>
                  <p className={`${hint} mt-2 text-[11px]`}>
                    Matches the inputs in this tip card only (kicker, horse, odds, stars, silks).{" "}
                    <strong className="text-slate-400">Render scenes</strong> to preview.
                  </p>
                  <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
                    <NextOffFieldAnimRow
                      fieldLabel="Scene kicker"
                      anim={tipAnim?.sceneKicker}
                      onChange={(next) => setTipFieldAnim(i, "sceneKicker", next)}
                    />
                    <NextOffFieldAnimRow
                      fieldLabel="Horse"
                      anim={tipAnim?.horse}
                      onChange={(next) => setTipFieldAnim(i, "horse", next)}
                    />
                    <NextOffFieldAnimRow
                      fieldLabel="Odds"
                      anim={tipAnim?.odds}
                      onChange={(next) => setTipFieldAnim(i, "odds", next)}
                    />
                    <NextOffFieldAnimRow
                      fieldLabel="Stars"
                      anim={tipAnim?.stars}
                      onChange={(next) => setTipFieldAnim(i, "stars", next)}
                    />
                    <NextOffFieldAnimRow
                      fieldLabel="Silks"
                      anim={tipAnim?.silks}
                      onChange={(next) => setTipFieldAnim(i, "silks", next)}
                    />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-3 border-t border-[#1f2d26] pt-4">
          <p className="text-xs font-semibold text-[#22d3ee]">Outro slide</p>
          <label className={label}>
            Outro kicker (top line)
            <input
              className={`${input} mt-1`}
              value={b.outroKicker ?? ""}
              placeholder={BRAND_MARK}
              onChange={(e) => push({ ...b, outroKicker: e.target.value })}
            />
          </label>
          <label className={label}>
            Outro line (on-screen CTA)
            <input
              className={`${input} mt-1`}
              value={b.outroCta ?? ""}
              placeholder="Follow for more tips"
              onChange={(e) => push({ ...b, outroCta: e.target.value })}
            />
          </label>
          <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Animation — outro scene
            </summary>
            <p className={`${hint} mt-2 text-[11px]`}>
              Matches the outro fields above (kicker, CTA, course). <strong className="text-slate-400">Render scenes</strong> to preview.
            </p>
            <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
              <NextOffFieldAnimRow
                fieldLabel="Outro kicker"
                anim={b.sceneAnimations?.outro?.outroKicker}
                onChange={(next) => setOutroFieldAnim("outroKicker", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Outro CTA (headline)"
                anim={b.sceneAnimations?.outro?.outroCta}
                onChange={(next) => setOutroFieldAnim("outroCta", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Course"
                anim={b.sceneAnimations?.outro?.course}
                onChange={(next) => setOutroFieldAnim("course", next)}
              />
            </div>
          </details>
        </div>
      </EditorCollapsible>
    );
  }

  if (src.format === "fast-results") {
    const bundle = src.bundle;
    const r = bundle.result;
    const race = r.race;
    const placings = padPlacings(r);

    const push = (nextBundle: typeof bundle) => {
      commitTemplate(setContent, content, { format: "fast-results", bundle: nextBundle }, onAfterTemplateCommit);
    };

    const pushResult = (result: Result) => {
      push({ ...bundle, result });
    };

    const setRace = (patch: Partial<Race>) => pushResult({ ...r, race: { ...race, ...patch } });
    const setPlacing = (i: number, patch: Partial<Placing>) => {
      pushResult({ ...r, placings: placings.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
    };

    const setFastIntroAnim = (field: keyof FastIntroFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      push({
        ...bundle,
        sceneAnimations: {
          ...bundle.sceneAnimations,
          intro: { ...bundle.sceneAnimations?.intro, [field]: anim },
        },
      });
    };
    const setFastWinnerAnim = (field: keyof FastWinnerFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      push({
        ...bundle,
        sceneAnimations: {
          ...bundle.sceneAnimations,
          winner: { ...bundle.sceneAnimations?.winner, [field]: anim },
        },
      });
    };
    const setFastPlacingsAnim = (field: keyof FastPlacingsFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      push({
        ...bundle,
        sceneAnimations: {
          ...bundle.sceneAnimations,
          placings: { ...bundle.sceneAnimations?.placings, [field]: anim },
        },
      });
    };
    const setFastOutroAnim = (field: keyof FastOutroFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
      push({
        ...bundle,
        sceneAnimations: {
          ...bundle.sceneAnimations,
          outro: { ...bundle.sceneAnimations?.outro, [field]: anim },
        },
      });
    };

    return (
      <EditorCollapsible title="Template data — Fast results" unstyled={templateSectionUnstyled}>
        <p className={`mb-3 ${hint}`}>
          Edit fields below — the preview clears until you{" "}
          <strong className="font-semibold text-amber-800 dark:text-[#eab308]">Render scenes</strong>. Use{" "}
          <strong className={hintStrong}>Save draft</strong> under silks or{" "}
          <strong className={hintStrong}>Save template</strong> in the browser panel to keep silks after refresh.
        </p>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#22d3ee]">Race</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={label}>
              Course
              <input className={`${input} mt-1`} value={race.course} onChange={(e) => setRace({ course: e.target.value })} />
            </label>
            <label className={label}>
              Time
              <input className={`${input} mt-1`} value={race.raceTime} onChange={(e) => setRace({ raceTime: e.target.value })} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Title
              <input className={`${input} mt-1`} value={race.title} onChange={(e) => setRace({ title: e.target.value })} />
            </label>
            <label className={label}>
              Distance
              <input className={`${input} mt-1`} value={race.distance} onChange={(e) => setRace({ distance: e.target.value })} />
            </label>
            <label className={label}>
              Going
              <input className={`${input} mt-1`} value={race.going} onChange={(e) => setRace({ going: e.target.value })} />
            </label>
            <label className={label}>
              Race id
              <input className={`${input} mt-1`} value={race.id} onChange={(e) => setRace({ id: e.target.value })} />
            </label>
          </div>
          <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Animation — intro (Fast results)
            </summary>
            <p className={`${hint} mt-2 text-[11px]`}>
              First scene (kicker, title, course, time, date). <strong className="text-slate-400">Render scenes</strong> to preview.
            </p>
            <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
              <NextOffFieldAnimRow
                fieldLabel="Scene kicker"
                anim={bundle.sceneAnimations?.intro?.sceneKicker}
                onChange={(next) => setFastIntroAnim("sceneKicker", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Title"
                anim={bundle.sceneAnimations?.intro?.title}
                onChange={(next) => setFastIntroAnim("title", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Course"
                anim={bundle.sceneAnimations?.intro?.course}
                onChange={(next) => setFastIntroAnim("course", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Time"
                anim={bundle.sceneAnimations?.intro?.raceTime}
                onChange={(next) => setFastIntroAnim("raceTime", next)}
              />
              <NextOffFieldAnimRow
                fieldLabel="Date"
                anim={bundle.sceneAnimations?.intro?.raceDate}
                onChange={(next) => setFastIntroAnim("raceDate", next)}
              />
            </div>
          </details>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 border-t border-[#1f2d26] pt-4">
          <label className={label}>
            Board 1 — winner
            <input
              className={`${input} mt-1`}
              value={r.winner}
              onChange={(e) => pushResult({ ...r, winner: e.target.value })}
            />
          </label>
          <label className={label}>
            SP
            <input className={`${input} mt-1`} value={r.sp} onChange={(e) => pushResult({ ...r, sp: e.target.value })} />
          </label>
        </div>
        <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
          <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Animation — Board 1 (winner)
          </summary>
          <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
            <NextOffFieldAnimRow
              fieldLabel="Scene kicker"
              anim={bundle.sceneAnimations?.winner?.sceneKicker}
              onChange={(next) => setFastWinnerAnim("sceneKicker", next)}
            />
            <NextOffFieldAnimRow
              fieldLabel="Silks"
              anim={bundle.sceneAnimations?.winner?.silks}
              onChange={(next) => setFastWinnerAnim("silks", next)}
            />
            <NextOffFieldAnimRow
              fieldLabel="Winner"
              anim={bundle.sceneAnimations?.winner?.winner}
              onChange={(next) => setFastWinnerAnim("winner", next)}
            />
            <NextOffFieldAnimRow
              fieldLabel="SP"
              anim={bundle.sceneAnimations?.winner?.sp}
              onChange={(next) => setFastWinnerAnim("sp", next)}
            />
            <NextOffFieldAnimRow
              fieldLabel="Course"
              anim={bundle.sceneAnimations?.winner?.course}
              onChange={(next) => setFastWinnerAnim("course", next)}
            />
          </div>
        </details>
        <div className="mt-4 space-y-3 border-t border-[#1f2d26] pt-4">
          <p className="text-xs font-semibold text-[#22d3ee]">Board 2 — placings (up to four)</p>
          <p className={`${hint} text-[11px]`}>
            Silks show on Board 1 &amp; Board 2 scenes, social cards, and the Fast results list page.
          </p>
          {placings.map((p, i) => {
            const silk = p.silks ?? defaultSilksForIndex(i);
            return (
              <div key={i} className="rounded-lg border border-[#1f2d26] bg-black/30 p-3 space-y-2">
                <div className="grid grid-cols-[4rem_1fr_1fr] gap-2">
                  <label className={label}>
                    Pos
                    <input
                      type="number"
                      min={1}
                      className={`${input} mt-1`}
                      value={p.position}
                      onChange={(e) => setPlacing(i, { position: Number(e.target.value) || 1 })}
                    />
                  </label>
                  <label className={label}>
                    Horse
                    <input className={`${input} mt-1`} value={p.horse} onChange={(e) => setPlacing(i, { horse: e.target.value })} />
                  </label>
                  <label className={label}>
                    SP
                    <input className={`${input} mt-1`} value={p.sp} onChange={(e) => setPlacing(i, { sp: e.target.value })} />
                  </label>
                </div>
                <p className={label}>Silks</p>
                <SilkEditor
                  silk={silk}
                  onPatch={(patch) => setPlacing(i, { silks: { ...silk, ...patch } })}
                  onSaveBrowserDraft={onSaveBrowserDraft}
                />
                <HorseCardSaveBar silk={silk} onSaveBrowserDraft={onSaveBrowserDraft} />
              </div>
            );
          })}
        </div>
        <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
          <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Animation — Board 2 (placings)
          </summary>
          <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
            <NextOffFieldAnimRow
              fieldLabel="Scene kicker"
              anim={bundle.sceneAnimations?.placings?.sceneKicker}
              onChange={(next) => setFastPlacingsAnim("sceneKicker", next)}
            />
            <NextOffFieldAnimRow
              fieldLabel="Placings card"
              anim={bundle.sceneAnimations?.placings?.card}
              onChange={(next) => setFastPlacingsAnim("card", next)}
            />
          </div>
        </details>
        <label className={`${label} mt-4 block`}>
          Outro line
          <input
            className={`${input} mt-1`}
            value={r.outroCta ?? ""}
            placeholder="Full results on …"
            onChange={(e) => pushResult({ ...r, outroCta: e.target.value })}
          />
        </label>
        <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
          <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Animation — outro
          </summary>
          <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
            <NextOffFieldAnimRow
              fieldLabel="Scene kicker"
              anim={bundle.sceneAnimations?.outro?.sceneKicker}
              onChange={(next) => setFastOutroAnim("sceneKicker", next)}
            />
            <NextOffFieldAnimRow
              fieldLabel="CTA headline"
              anim={bundle.sceneAnimations?.outro?.cta}
              onChange={(next) => setFastOutroAnim("cta", next)}
            />
          </div>
        </details>
      </EditorCollapsible>
    );
  }

  /* racecard */
  const snap = src.snapshot;

  const pushSnap = (next: RacecardSnapshot) => {
    commitTemplate(
      setContent,
      content,
      { format: "racecard", snapshot: { ...next, id: next.id || contentId } },
      onAfterTemplateCommit,
    );
  };

  const race = snap.race;
  const setRace = (patch: Partial<Race>) => pushSnap({ ...snap, race: { ...race, ...patch } });

  const runners = [...snap.runners].sort((a, b) => a.number - b.number);
  const setRunners = (next: Runner[]) => pushSnap({ ...snap, runners: next });
  const setRunner = (i: number, patch: Partial<Runner>) => {
    const next = runners.map((r, j) => (j === i ? { ...r, ...patch } : r));
    setRunners(next);
  };
  const addRunner = () => {
    const n = runners.length ? Math.max(...runners.map((r) => r.number)) + 1 : 1;
    setRunners([...runners, emptyRunner(n, runners.length)]);
  };
  const removeRunner = (i: number) => {
    setRunners(runners.filter((_, j) => j !== i));
  };

  const commitTop = (idx: number, v: string) => {
    const next = [snap.topPicks[0] ?? "", snap.topPicks[1] ?? "", snap.topPicks[2] ?? ""];
    next[idx] = v;
    pushSnap({ ...snap, topPicks: next });
  };

  const mover = snap.marketMover;
  const setMover = (patch: Partial<Runner> | undefined) => {
    if (!patch) {
      pushSnap({ ...snap, marketMover: undefined });
      return;
    }
    pushSnap({
      ...snap,
      marketMover: {
        number: mover?.number ?? 0,
        horse: mover?.horse ?? "",
        odds: mover?.odds ?? "",
        movement: mover?.movement ?? "steady",
        movementText: mover?.movementText ?? "",
        ...patch,
      },
    });
  };

  const enableMover = Boolean(mover);
  const toggleMover = (on: boolean) => {
    if (!on) pushSnap({ ...snap, marketMover: undefined });
    else
      pushSnap({
        ...snap,
        marketMover: mover ?? {
          number: 0,
          horse: "",
          odds: "",
          movement: "steady",
          movementText: "",
        },
      });
  };

  const setRcIntroAnim = (field: keyof RcIntroFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
    pushSnap({
      ...snap,
      sceneAnimations: {
        ...snap.sceneAnimations,
        intro: { ...snap.sceneAnimations?.intro, [field]: anim },
      },
    });
  };
  const setRcBoardAnim = (field: keyof RcBoardGridFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
    pushSnap({
      ...snap,
      sceneAnimations: {
        ...snap.sceneAnimations,
        board: { ...snap.sceneAnimations?.board, [field]: anim },
      },
    });
  };
  const setRcMoverAnim = (field: keyof RcMoverFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
    pushSnap({
      ...snap,
      sceneAnimations: {
        ...snap.sceneAnimations,
        mover: { ...snap.sceneAnimations?.mover, [field]: anim },
      },
    });
  };
  const setRcCtaAnim = (field: keyof RcCtaFieldAnimations, anim: TemplateFieldAnimation | undefined) => {
    pushSnap({
      ...snap,
      sceneAnimations: {
        ...snap.sceneAnimations,
        cta: { ...snap.sceneAnimations?.cta, [field]: anim },
      },
    });
  };

  return (
    <EditorCollapsible title="Template data — Racecard" unstyled={templateSectionUnstyled}>
      <p className={`mb-3 ${hint}`}>
        Full field editor — boards paginate from <strong className="text-slate-400">Runners per board</strong>.{" "}
        <strong className="text-[#eab308]">Render scenes</strong> after changes.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={label}>
          Course
          <input className={`${input} mt-1`} value={race.course} onChange={(e) => setRace({ course: e.target.value })} />
        </label>
        <label className={label}>
          Time
          <input className={`${input} mt-1`} value={race.raceTime} onChange={(e) => setRace({ raceTime: e.target.value })} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Title
          <input className={`${input} mt-1`} value={race.title} onChange={(e) => setRace({ title: e.target.value })} />
        </label>
        <label className={label}>
          Distance
          <input className={`${input} mt-1`} value={race.distance} onChange={(e) => setRace({ distance: e.target.value })} />
        </label>
        <label className={label}>
          Going
          <input className={`${input} mt-1`} value={race.going} onChange={(e) => setRace({ going: e.target.value })} />
        </label>
        <label className={label}>
          Declared #
          <input
            type="number"
            className={`${input} mt-1`}
            value={race.runnersCount}
            onChange={(e) => setRace({ runnersCount: Number(e.target.value) || 0 })}
          />
        </label>
        <label className={label}>
          Race id
          <input className={`${input} mt-1`} value={race.id} onChange={(e) => setRace({ id: e.target.value })} />
        </label>
      </div>
      <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
        <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Animation — intro (Race card scene)
        </summary>
        <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
          <NextOffFieldAnimRow
            fieldLabel="Scene kicker"
            anim={snap.sceneAnimations?.intro?.sceneKicker}
            onChange={(next) => setRcIntroAnim("sceneKicker", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Title"
            anim={snap.sceneAnimations?.intro?.title}
            onChange={(next) => setRcIntroAnim("title", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Course"
            anim={snap.sceneAnimations?.intro?.course}
            onChange={(next) => setRcIntroAnim("course", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Time"
            anim={snap.sceneAnimations?.intro?.raceTime}
            onChange={(next) => setRcIntroAnim("raceTime", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Meta (date · runners)"
            anim={snap.sceneAnimations?.intro?.meta}
            onChange={(next) => setRcIntroAnim("meta", next)}
          />
        </div>
      </details>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 border-t border-[#1f2d26] pt-4">
        <label className={label}>
          Top pick 1
          <input className={`${input} mt-1`} value={snap.topPicks[0] ?? ""} onChange={(e) => commitTop(0, e.target.value)} />
        </label>
        <label className={label}>
          Top pick 2
          <input className={`${input} mt-1`} value={snap.topPicks[1] ?? ""} onChange={(e) => commitTop(1, e.target.value)} />
        </label>
        <label className={label}>
          Top pick 3
          <input className={`${input} mt-1`} value={snap.topPicks[2] ?? ""} onChange={(e) => commitTop(2, e.target.value)} />
        </label>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 border-t border-[#1f2d26] pt-4">
        <label className={label}>
          Footer note (last board / CTA)
          <input
            className={`${input} mt-1`}
            value={snap.footerNote ?? ""}
            placeholder="Optional — overrides each-way line"
            onChange={(e) => pushSnap({ ...snap, footerNote: e.target.value || undefined })}
          />
        </label>
        <label className={label}>
          Each-way places (0 = hide)
          <input
            type="number"
            min={0}
            className={`${input} mt-1`}
            value={snap.eachWayPlaces ?? ""}
            placeholder="e.g. 4"
            onChange={(e) => {
              const v = e.target.value;
              pushSnap({
                ...snap,
                eachWayPlaces: v === "" ? undefined : Number(v) || 0,
              });
            }}
          />
        </label>
        <label className={label}>
          Runners per board (6–16)
          <input
            type="number"
            min={6}
            max={16}
            className={`${input} mt-1`}
            value={snap.boardRunnersPerPage ?? ""}
            placeholder="Default from generator"
            onChange={(e) => {
              const v = e.target.value;
              pushSnap({
                ...snap,
                boardRunnersPerPage: v === "" ? undefined : Math.min(16, Math.max(6, Number(v) || 11)),
              });
            }}
          />
        </label>
      </div>
      <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
        <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Animation — Board 1 / LED headers
        </summary>
        <p className={`${hint} mt-2 text-[11px]`}>
          Applies to each paginated board (title block + runner list card). <strong className="text-slate-400">Render scenes</strong> to preview.
        </p>
        <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
          <NextOffFieldAnimRow
            fieldLabel="Header (time · course · date)"
            anim={snap.sceneAnimations?.board?.headerTitle}
            onChange={(next) => setRcBoardAnim("headerTitle", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Race name"
            anim={snap.sceneAnimations?.board?.raceName}
            onChange={(next) => setRcBoardAnim("raceName", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Page meta"
            anim={snap.sceneAnimations?.board?.pageMeta}
            onChange={(next) => setRcBoardAnim("pageMeta", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Runner list card"
            anim={snap.sceneAnimations?.board?.listCard}
            onChange={(next) => setRcBoardAnim("listCard", next)}
          />
        </div>
      </details>
      <details className="mt-3 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
        <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Animation — CTA (final scene)
        </summary>
        <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
          <NextOffFieldAnimRow
            fieldLabel="Course (kicker)"
            anim={snap.sceneAnimations?.cta?.course}
            onChange={(next) => setRcCtaAnim("course", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Brand (Racing365)"
            anim={snap.sceneAnimations?.cta?.brand}
            onChange={(next) => setRcCtaAnim("brand", next)}
          />
          <NextOffFieldAnimRow
            fieldLabel="Footer / CTA line"
            anim={snap.sceneAnimations?.cta?.cta}
            onChange={(next) => setRcCtaAnim("cta", next)}
          />
        </div>
      </details>
      <div className="mt-4 border-t border-[#1f2d26] pt-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enableMover} onChange={(e) => toggleMover(e.target.checked)} />
          Include market mover scene
        </label>
        {enableMover && mover && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 rounded-lg border border-[#1f2d26] bg-black/30 p-3">
            <label className={label}>
              Horse
              <input className={`${input} mt-1`} value={mover.horse} onChange={(e) => setMover({ horse: e.target.value })} />
            </label>
            <label className={label}>
              Odds
              <input className={`${input} mt-1`} value={mover.odds} onChange={(e) => setMover({ odds: e.target.value })} />
            </label>
            <label className={label}>
              Movement
              <select
                className={`${input} mt-1`}
                value={mover.movement ?? "steady"}
                onChange={(e) => setMover({ movement: e.target.value as Movement })}
              >
                {MOVEMENTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${label} sm:col-span-2`}>
              Movement text
              <input
                className={`${input} mt-1`}
                value={mover.movementText ?? ""}
                onChange={(e) => setMover({ movementText: e.target.value })}
              />
            </label>
            <p className={`${label} col-span-2 !mt-2`}>Market mover silks</p>
            <MoverSilkRow mover={mover} setMover={setMover} onSaveBrowserDraft={onSaveBrowserDraft} />
            <HorseCardSaveBar
              className="sm:col-span-2"
              silk={mover.silks ?? defaultSilksForIndex(0)}
              onSaveBrowserDraft={onSaveBrowserDraft}
            />
            <details className="col-span-2 mt-2 rounded-lg border border-[#1f2d26] bg-black/25 px-3 py-2">
              <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Animation — market mover
              </summary>
              <div className="mt-2 space-y-2 border-t border-[#1f2d26] pt-3">
                <NextOffFieldAnimRow
                  fieldLabel="Scene kicker"
                  anim={snap.sceneAnimations?.mover?.sceneKicker}
                  onChange={(next) => setRcMoverAnim("sceneKicker", next)}
                />
                <NextOffFieldAnimRow
                  fieldLabel="Silks"
                  anim={snap.sceneAnimations?.mover?.silks}
                  onChange={(next) => setRcMoverAnim("silks", next)}
                />
                <NextOffFieldAnimRow
                  fieldLabel="Horse"
                  anim={snap.sceneAnimations?.mover?.horse}
                  onChange={(next) => setRcMoverAnim("horse", next)}
                />
                <NextOffFieldAnimRow
                  fieldLabel="Odds"
                  anim={snap.sceneAnimations?.mover?.odds}
                  onChange={(next) => setRcMoverAnim("odds", next)}
                />
                <NextOffFieldAnimRow
                  fieldLabel="Movement text"
                  anim={snap.sceneAnimations?.mover?.movementText}
                  onChange={(next) => setRcMoverAnim("movementText", next)}
                />
              </div>
            </details>
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-[#1f2d26] pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#22d3ee]">Runners</p>
          <button
            type="button"
            className="rounded border border-[#1f2d26] px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-[#1a2620]"
            onClick={addRunner}
          >
            + Add runner
          </button>
        </div>
        <p className="mb-2 text-[10px] text-slate-600">
          Silks appear on LED racecard boards (body / secondary / cap colours + pattern).
        </p>
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {runners.map((r, i) => {
            const silk = r.silks ?? defaultSilksForIndex(i);
            const patchSilk = (patch: Partial<RunnerSilks>) =>
              setRunner(i, { silks: { ...silk, ...patch } });
            return (
              <div key={i} className="space-y-2 rounded-lg border border-[#1f2d26]/80 bg-black/25 p-2">
                <div className="grid grid-cols-[3.5rem_1fr_4rem_1fr_auto] gap-1 items-end">
                  <label className={label}>
                    #
                    <input
                      type="number"
                      className={`${input} mt-1`}
                      value={r.number}
                      onChange={(e) => setRunner(i, { number: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className={label}>
                    Horse
                    <input
                      className={`${input} mt-1`}
                      value={r.horse}
                      onChange={(e) => setRunner(i, { horse: e.target.value })}
                    />
                  </label>
                  <label className={label}>
                    Odds
                    <input
                      className={`${input} mt-1`}
                      value={r.odds}
                      onChange={(e) => setRunner(i, { odds: e.target.value })}
                    />
                  </label>
                  <label className={`${label} col-span-2 sm:col-span-1`}>
                    Jockey (opt.)
                    <input
                      className={`${input} mt-1`}
                      value={r.jockey ?? ""}
                      onChange={(e) => setRunner(i, { jockey: e.target.value || undefined })}
                    />
                  </label>
                  <button
                    type="button"
                    className="mb-0.5 text-xs text-red-400 hover:underline"
                    onClick={() => removeRunner(i)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <label className={label}>
                    Silk pattern
                    <select
                      className={`${input} mt-1`}
                      value={silk.pattern ?? "halves"}
                      onChange={(e) => patchSilk({ pattern: e.target.value as SilkPattern })}
                    >
                      {SILK_PATTERN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={label}>
                    Body
                    <div className="mt-1 flex gap-1">
                      <input
                        type="color"
                        className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
                        value={pickHex(silk.body ?? "", "#444444")}
                        onChange={(e) => patchSilk({ body: e.target.value })}
                      />
                      <input
                        className={`${input} min-w-0 flex-1 font-mono text-xs`}
                        value={silk.body}
                        onChange={(e) => patchSilk({ body: e.target.value })}
                      />
                    </div>
                  </label>
                  <label className={label}>
                    Secondary
                    <div className="mt-1 flex gap-1">
                      <input
                        type="color"
                        className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
                        value={pickHex(silk.secondary, pickHex(silk.body ?? "", "#888888"))}
                        onChange={(e) => patchSilk({ secondary: e.target.value })}
                      />
                      <input
                        className={`${input} min-w-0 flex-1 font-mono text-xs`}
                        value={silk.secondary ?? ""}
                        placeholder="optional"
                        onChange={(e) => patchSilk({ secondary: e.target.value || undefined })}
                      />
                    </div>
                  </label>
                  <label className={label}>
                    Cap
                    <div className="mt-1 flex gap-1">
                      <input
                        type="color"
                        className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
                        value={pickHex(silk.cap, "#f8fafc")}
                        onChange={(e) => patchSilk({ cap: e.target.value })}
                      />
                      <input
                        className={`${input} min-w-0 flex-1 font-mono text-xs`}
                        value={silk.cap ?? ""}
                        placeholder="optional"
                        onChange={(e) => patchSilk({ cap: e.target.value || undefined })}
                      />
                    </div>
                  </label>
                  <label className={label}>
                    Accent
                    <div className="mt-1 flex gap-1">
                      <input
                        type="color"
                        className="h-9 w-10 cursor-pointer rounded border border-[#1f2d26] bg-[#0a0e0c] p-0.5"
                        value={pickHex(silk.accent, "#ffffff")}
                        onChange={(e) => patchSilk({ accent: e.target.value })}
                      />
                      <input
                        className={`${input} min-w-0 flex-1 font-mono text-xs`}
                        value={silk.accent ?? ""}
                        placeholder="bands / collar"
                        onChange={(e) => patchSilk({ accent: e.target.value || undefined })}
                      />
                    </div>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-[10px] text-slate-500 hover:text-[#22c55e] hover:underline"
                    onClick={() => setRunner(i, { silks: defaultSilksForIndex(i) })}
                  >
                    Reset silks
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-slate-500 hover:text-red-400 hover:underline"
                    onClick={() => setRunner(i, { silks: undefined })}
                  >
                    Hide silks on board
                  </button>
                </div>
                <HorseCardSaveBar silk={silk} onSaveBrowserDraft={onSaveBrowserDraft} />
              </div>
            );
          })}
        </div>
      </div>
    </EditorCollapsible>
  );
}
