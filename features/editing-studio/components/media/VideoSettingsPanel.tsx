"use client";

import type { VideoEditSettingsV1, VideoOutputAspect } from "@/features/editing-studio/types/video-edit";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

type Props = {
  settings: VideoEditSettingsV1;
  onChange: (patch: Partial<VideoEditSettingsV1>) => void;
  /** When false, subtitle toggle is disabled with helper text. */
  subtitlesAvailable: boolean;
};

export function VideoSettingsPanel({ settings, onChange, subtitlesAvailable }: Props) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Audio
        </legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input type="checkbox" checked={settings.muted} onChange={(e) => onChange({ muted: e.target.checked })} />
          Mute output
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input
            type="checkbox"
            checked={settings.useSourceAudio}
            onChange={(e) => onChange({ useSourceAudio: e.target.checked })}
            disabled={settings.muted}
          />
          Use source audio
        </label>
        {settings.muted ? <p className="text-xs text-[color:var(--text-muted)]">Muted exports ignore source audio.</p> : null}
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Layout
        </legend>
        <label className="block text-xs font-medium text-[color:var(--text-secondary)]">
          Output aspect
          <select
            className={inputClass}
            style={inputStyle}
            value={settings.outputAspect}
            onChange={(e) => onChange({ outputAspect: e.target.value as VideoOutputAspect })}
          >
            <option value="original">Original</option>
            <option value="9:16">9:16 (vertical)</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input
            type="checkbox"
            checked={settings.verticalBlurFill}
            onChange={(e) => onChange({ verticalBlurFill: e.target.checked })}
            disabled={settings.outputAspect !== "9:16"}
          />
          Blur background fill (vertical)
        </label>
        {settings.outputAspect !== "9:16" ? (
          <p className="text-xs text-[color:var(--text-muted)]">Blur fill applies when output is 9:16.</p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
          Overlays
        </legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input
            type="checkbox"
            checked={settings.headlineOverlay}
            onChange={(e) => onChange({ headlineOverlay: e.target.checked })}
          />
          Headline overlay
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input
            type="checkbox"
            checked={settings.useSubtitles}
            onChange={(e) => onChange({ useSubtitles: e.target.checked })}
            disabled={!subtitlesAvailable}
          />
          Subtitles / captions
          {!subtitlesAvailable ? (
            <span className="text-[10px] text-[color:var(--text-muted)]">(no subtitle metadata on this asset)</span>
          ) : null}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input type="checkbox" checked={settings.logoBug} onChange={(e) => onChange({ logoBug: e.target.checked })} />
          Logo bug
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--text-primary)]">
          <input type="checkbox" checked={settings.outroCard} onChange={(e) => onChange({ outroCard: e.target.checked })} />
          Outro card
        </label>
      </fieldset>
    </div>
  );
}
