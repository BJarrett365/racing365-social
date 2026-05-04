"use client";

import { useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import type { VoiceGender } from "@/types";
import { VOICE_PRESET_OPTIONS, type ElevenlabsVoiceOption, type VoicePreset } from "./types";

type Props = {
  voicePreset: VoicePreset;
  voiceGender: VoiceGender;
  voiceSpeed: number;
  previewBusy: boolean;
  canPreview: boolean;
  elevenlabsVoices: ElevenlabsVoiceOption[];
  elevenlabsVoiceId: string;
  voicesLoading?: boolean;
  voiceDiagnostics?: {
    totalDefaults: number;
    labelledDefaults: number;
    unlabelledDefaults: number;
    unlabelledVoiceNames: string[];
    myVoicesCount?: number;
  } | null;
  voiceProviderStatus?: string | null;
  saveMessage?: string | null;
  onPresetChange: (v: VoicePreset) => void;
  onVoiceGenderChange: (v: VoiceGender) => void;
  onVoiceSpeedChange: (v: number) => void;
  onElevenlabsVoiceChange: (voiceId: string) => void;
  onPreview: () => void;
  onStopPreview: () => void;
  canStopPreview: boolean;
  onSave: () => void;
};

export function VoiceSettingsPanel({
  voicePreset,
  voiceGender,
  voiceSpeed,
  previewBusy,
  canPreview,
  elevenlabsVoices,
  elevenlabsVoiceId,
  voicesLoading,
  voiceDiagnostics,
  voiceProviderStatus,
  saveMessage,
  onPresetChange,
  onVoiceGenderChange,
  onVoiceSpeedChange,
  onElevenlabsVoiceChange,
  onPreview,
  onStopPreview,
  canStopPreview,
  onSave,
}: Props) {
  const [useCaseFilter, setUseCaseFilter] = useState("All");
  const useCaseOptions = useMemo(() => {
    const values = new Set<string>();
    for (const v of elevenlabsVoices) {
      const uc = v.labels?.use_case?.trim();
      if (uc) values.add(uc);
    }
    return ["All", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [elevenlabsVoices]);
  const filteredVoices = useMemo(
    () =>
      useCaseFilter === "All"
        ? elevenlabsVoices
        : elevenlabsVoices.filter((v) => v.labels?.use_case?.trim() === useCaseFilter),
    [elevenlabsVoices, useCaseFilter],
  );
  const grouped = filteredVoices.reduce<Record<string, ElevenlabsVoiceOption[]>>((acc, voice) => {
    const group = voice.groupLabel?.trim() || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group]!.push(voice);
    return acc;
  }, {});
  const groupPriority: Record<string, number> = {
    "My voices": 0,
    Female: 1,
    Male: 2,
    Unspecified: 3,
    Other: 4,
  };
  const groupOrder = Object.keys(grouped).sort((a, b) => {
    const pa = groupPriority[a] ?? 99;
    const pb = groupPriority[b] ?? 99;
    return pa === pb ? a.localeCompare(b) : pa - pb;
  });
  const sortVoices = (voices: ElevenlabsVoiceOption[]) =>
    [...voices].sort((a, b) => {
      const aAccent = (a.labels?.accent ?? "").toLowerCase().trim();
      const bAccent = (b.labels?.accent ?? "").toLowerCase().trim();
      const aBritish = aAccent.includes("british") || aAccent.includes("uk");
      const bBritish = bAccent.includes("british") || bAccent.includes("uk");
      if (aBritish !== bBritish) return aBritish ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  const selectedVoice = elevenlabsVoices.find((v) => v.voiceId === elevenlabsVoiceId) ?? null;
  const selectedBadges = selectedVoice?.labels
    ? Object.entries(selectedVoice.labels)
        .filter(([, value]) => String(value).trim())
        .slice(0, 6)
    : [];
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Voice settings</p>
      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
        Voice preset
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#eab308] focus:ring-2 focus:ring-[#eab308]/20"
          value={voicePreset}
          onChange={(e) => onPresetChange(e.target.value as VoicePreset)}
        >
          {VOICE_PRESET_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
        ElevenLabs voice
        <div className="mt-2 flex flex-wrap gap-1.5">
          {useCaseOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUseCaseFilter(option)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                useCaseFilter === option
                  ? "border-[#16a34a] bg-[#16a34a] text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
              }`}
            >
              {prettyLabel(option)}
            </button>
          ))}
        </div>
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#eab308] focus:ring-2 focus:ring-[#eab308]/20 disabled:bg-slate-100 disabled:text-slate-400"
          value={elevenlabsVoiceId}
          onChange={(e) => onElevenlabsVoiceChange(e.target.value)}
          disabled={voicesLoading || filteredVoices.length === 0}
        >
          {filteredVoices.length === 0 ? (
            <option value="">{voicesLoading ? "Loading voices..." : "No voices available"}</option>
          ) : (
            groupOrder.map((group) => (
              <optgroup key={group} label={group}>
                {sortVoices(grouped[group]!).map((v) => (
                  <option key={v.voiceId} value={v.voiceId}>
                    {v.name}
                    {v.category ? ` · ${v.category}` : ""}
                    {v.labels?.accent ? ` · ${prettyLabel(v.labels.accent)}` : ""}
                    {v.labels?.use_case ? ` · ${prettyLabel(v.labels.use_case)}` : ""}
                    {v.labels?.age ? ` · ${prettyLabel(v.labels.age)}` : ""}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
      </label>
      {selectedVoice && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">{selectedVoice.name}</p>
            <span className="rounded-full border border-[#1d4ed8]/20 bg-[#1d4ed8] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              Using now
            </span>
          </div>
          {selectedVoice.description ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{selectedVoice.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedVoice.category ? (
              <span className="rounded-full border border-[#16a34a]/20 bg-[#dcfce7] px-2.5 py-1 text-[10px] font-bold text-[#166534]">
                {prettyLabel(selectedVoice.category)}
              </span>
            ) : null}
            {selectedBadges.map(([key, value]) => (
              <span
                key={key}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700"
              >
                {prettyLabel(key)}: {prettyLabel(value)}
              </span>
            ))}
          </div>
        </div>
      )}
      {voiceDiagnostics && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            Voices loaded: <span className="font-bold text-slate-900">{voiceDiagnostics.totalDefaults}</span>
            {typeof voiceDiagnostics.myVoicesCount === "number" && voiceDiagnostics.myVoicesCount > 0 ? (
              <>
                {" "}
                · <span className="font-bold text-[#15803d]">Your voices: {voiceDiagnostics.myVoicesCount}</span>
              </>
            ) : null}{" "}
            · With labels: <span className="font-bold text-slate-900">{voiceDiagnostics.labelledDefaults}</span>
          </p>
          {voiceDiagnostics.unlabelledDefaults > 0 && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-800">
              Missing labels on {voiceDiagnostics.unlabelledDefaults} voice(s):{" "}
              {voiceDiagnostics.unlabelledVoiceNames.slice(0, 8).join(", ")}
            </p>
          )}
        </div>
      )}
      {voiceProviderStatus && voiceProviderStatus !== "ok" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {voiceProviderStatus === "auth_failed"
            ? "ElevenLabs key is saved but not authorised. Re-save a valid key in Admin."
            : voiceProviderStatus === "missing_key"
              ? "No ElevenLabs key found in Admin settings."
              : "Using fallback voice list right now."}
        </p>
      )}

      <div className="flex flex-wrap gap-4" role="group" aria-label="Voice gender">
        {([
          ["female", "Female voice"],
          ["male", "Male voice"],
        ] as const).map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="radio"
              name="voice-gender"
              className="h-4 w-4 accent-[#22d3ee]"
              checked={voiceGender === value}
              onChange={() => onVoiceGenderChange(value)}
            />
            {label}
          </label>
        ))}
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
          Speed / tempo <span className="font-mono font-normal normal-case text-[#22d3ee]">{voiceSpeed.toFixed(2)}×</span>
        </span>
        <input
          type="range"
          className="mt-2 block w-full accent-[#22d3ee]"
          min={0.5}
          max={2}
          step={0.05}
          value={voiceSpeed}
          onChange={(e) => onVoiceSpeedChange(Number(e.target.value))}
        />
        <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] font-medium text-slate-500">
          <span>0.85 slower / dramatic</span>
          <span>1.0 normal</span>
          <span>1.15 Shorts</span>
          <span>1.3 fast tips</span>
        </div>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <R365Button variant="ghost" onClick={onPreview} disabled={previewBusy || !canPreview}>
          {previewBusy ? "Generating preview…" : "Preview audio"}
        </R365Button>
        <R365Button variant="ghost" onClick={onStopPreview} disabled={!canStopPreview}>
          Stop
        </R365Button>
        <R365Button onClick={onSave}>Save</R365Button>
      </div>
      {saveMessage ? <p className="text-[10px] text-[#22c55e]">{saveMessage}</p> : null}
    </div>
  );
}

function prettyLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
