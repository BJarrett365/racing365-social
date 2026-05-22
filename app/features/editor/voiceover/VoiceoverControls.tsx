"use client";

import { R365Button } from "@/app/components/R365Button";
import type { CreatorProfileOption, DeliveryStyle, ToneStyle, VoiceStyle } from "./types";

type Props = {
  voiceStyle: VoiceStyle;
  deliveryStyle: DeliveryStyle;
  tone: ToneStyle;
  optimiseForVoiceover: boolean;
  addEmphasis: boolean;
  creatorProfiles?: CreatorProfileOption[];
  selectedCreatorProfileId?: string;
  loading: boolean;
  onVoiceStyleChange: (v: VoiceStyle) => void;
  onDeliveryStyleChange: (v: DeliveryStyle) => void;
  onToneChange: (v: ToneStyle) => void;
  onOptimiseChange: (v: boolean) => void;
  onAddEmphasisChange: (v: boolean) => void;
  onCreatorProfileChange?: (v: string) => void;
  onImprove: () => void;
  onGenerateVersions: () => void;
  onRegenerate: () => void;
};

export function VoiceoverControls(props: Props) {
  const {
    voiceStyle,
    deliveryStyle,
    tone,
    optimiseForVoiceover,
    addEmphasis,
    creatorProfiles,
    selectedCreatorProfileId,
    loading,
    onVoiceStyleChange,
    onDeliveryStyleChange,
    onToneChange,
    onOptimiseChange,
    onAddEmphasisChange,
    onCreatorProfileChange,
    onImprove,
    onGenerateVersions,
    onRegenerate,
  } = props;

  return (
    <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 space-y-3">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Creator profile
        <select
          className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-black px-2 py-2 text-xs text-white"
          value={selectedCreatorProfileId ?? ""}
          onChange={(e) => onCreatorProfileChange?.(e.target.value)}
          disabled={!onCreatorProfileChange}
        >
          <option value="">Default journalist style</option>
          {(creatorProfiles ?? []).map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} · {profile.brand}
              {profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Voice style
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-black px-2 py-2 text-xs text-white"
            value={voiceStyle}
            onChange={(e) => onVoiceStyleChange(e.target.value as VoiceStyle)}
          >
            {(["Journalist", "Punchy Tips", "Calm / Studio", "Fast Picks"] as const).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Delivery style
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-black px-2 py-2 text-xs text-white"
            value={deliveryStyle}
            onChange={(e) => onDeliveryStyleChange(e.target.value as DeliveryStyle)}
          >
            {(["Smooth", "Balanced", "Fast"] as const).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Tone
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-black px-2 py-2 text-xs text-white"
            value={tone}
            onChange={(e) => onToneChange(e.target.value as ToneStyle)}
          >
            {(["Neutral", "Confident", "Urgent"] as const).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={optimiseForVoiceover}
            onChange={(e) => onOptimiseChange(e.target.checked)}
          />
          Optimise for voiceover
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={addEmphasis}
            onChange={(e) => onAddEmphasisChange(e.target.checked)}
          />
          Add emphasis to key picks
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <R365Button onClick={onImprove} disabled={loading}>
          {loading ? "Writing script..." : "Improve with AI"}
        </R365Button>
        <R365Button onClick={onGenerateVersions} disabled={loading}>
          {loading ? "Writing script..." : "Generate 3 versions"}
        </R365Button>
        <R365Button onClick={onRegenerate} disabled={loading}>
          {loading ? "Writing script..." : "Regenerate"}
        </R365Button>
      </div>
    </div>
  );
}
