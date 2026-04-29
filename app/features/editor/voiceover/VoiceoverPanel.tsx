"use client";

import type { ReactNode } from "react";
import { VoiceoverControls } from "./VoiceoverControls";
import { AiPromptPanel } from "./AiPromptPanel";
import { VoiceVersionPicker } from "./VoiceVersionPicker";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";
import { R365Button } from "@/app/components/R365Button";
import type {
  DeliveryStyle,
  ElevenlabsVoiceOption,
  ToneStyle,
  VoicePreset,
  VoiceStyle,
} from "./types";
import type { VoiceGender } from "@/types";

type Props = {
  script: string;
  onScriptChange: (v: string) => void;
  promptOpen: boolean;
  prompt: string;
  voiceStyle: VoiceStyle;
  deliveryStyle: DeliveryStyle;
  tone: ToneStyle;
  optimiseForVoiceover: boolean;
  addEmphasis: boolean;
  loading: boolean;
  error?: string | null;
  success?: string | null;
  settingsMessage?: string | null;
  hasPreviousDraft: boolean;
  versions: { versionA?: string; versionB?: string; versionC?: string };
  voicePreset: VoicePreset;
  voiceGender: VoiceGender;
  voiceSpeed: number;
  voicePreviewBusy: boolean;
  voicePreviewPlaying: boolean;
  canPreview: boolean;
  elevenlabsVoices: ElevenlabsVoiceOption[];
  elevenlabsVoiceId: string;
  voicesLoading: boolean;
  voiceDiagnostics: {
    totalDefaults: number;
    labelledDefaults: number;
    unlabelledDefaults: number;
    unlabelledVoiceNames: string[];
    myVoicesCount?: number;
  } | null;
  voiceProviderStatus?: string | null;
  voiceSettingsMsg?: string | null;
  onPromptToggle: () => void;
  onPromptChange: (v: string) => void;
  onSavePrompt: () => void;
  onResetPrompt: () => void;
  onVoiceStyleChange: (v: VoiceStyle) => void;
  onDeliveryStyleChange: (v: DeliveryStyle) => void;
  onToneChange: (v: ToneStyle) => void;
  onOptimiseChange: (v: boolean) => void;
  onAddEmphasisChange: (v: boolean) => void;
  onImprove: () => void;
  onGenerateVersions: () => void;
  onRegenerate: () => void;
  onRestorePrevious: () => void;
  onUseVersion: (v: string) => void;
  onVoicePresetChange: (v: VoicePreset) => void;
  onVoiceGenderChange: (v: VoiceGender) => void;
  onVoiceSpeedChange: (v: number) => void;
  onElevenlabsVoiceChange: (voiceId: string) => void;
  onPreviewVoice: () => void;
  onStopPreviewVoice: () => void;
  onSaveVoice: () => void;
  onSaveScriptPackage: () => void;
  scriptSavedAt?: number | null;
  /** Extra controls under the script textarea (e.g. racecard “fill from template”). */
  scriptActions?: ReactNode;
};

export function VoiceoverPanel(props: Props) {
  return (
    <div className="space-y-4">
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Voiceover script
        <textarea
          className="mt-1 min-h-[100px] w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-slate-300"
          value={props.script}
          onChange={(e) => props.onScriptChange(e.target.value)}
        />
      </label>
      {props.scriptActions ? <div className="mt-2 space-y-2">{props.scriptActions}</div> : null}

      <VoiceoverControls
        voiceStyle={props.voiceStyle}
        deliveryStyle={props.deliveryStyle}
        tone={props.tone}
        optimiseForVoiceover={props.optimiseForVoiceover}
        addEmphasis={props.addEmphasis}
        loading={props.loading}
        onVoiceStyleChange={props.onVoiceStyleChange}
        onDeliveryStyleChange={props.onDeliveryStyleChange}
        onToneChange={props.onToneChange}
        onOptimiseChange={props.onOptimiseChange}
        onAddEmphasisChange={props.onAddEmphasisChange}
        onImprove={props.onImprove}
        onGenerateVersions={props.onGenerateVersions}
        onRegenerate={props.onRegenerate}
      />
      <R365Button
        variant="ghost"
        onClick={props.onRestorePrevious}
        disabled={props.loading || !props.hasPreviousDraft}
      >
        Restore previous script/caption
      </R365Button>
      <R365Button variant="primary" onClick={props.onSaveScriptPackage} disabled={props.loading}>
        Save script + AI voice settings
      </R365Button>
      {props.scriptSavedAt ? (
        <p className="text-xs text-slate-400">
          Last saved:{" "}
          {new Date(props.scriptSavedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
        </p>
      ) : null}

      <AiPromptPanel
        open={props.promptOpen}
        prompt={props.prompt}
        busy={props.loading}
        onToggle={props.onPromptToggle}
        onPromptChange={props.onPromptChange}
        onSave={props.onSavePrompt}
        onReset={props.onResetPrompt}
      />

      <VoiceVersionPicker
        versionA={props.versions.versionA}
        versionB={props.versions.versionB}
        versionC={props.versions.versionC}
        onUse={props.onUseVersion}
      />

      <VoiceSettingsPanel
        voicePreset={props.voicePreset}
        voiceGender={props.voiceGender}
        voiceSpeed={props.voiceSpeed}
        previewBusy={props.voicePreviewBusy}
        canStopPreview={props.voicePreviewBusy || props.voicePreviewPlaying}
        canPreview={props.canPreview}
        elevenlabsVoices={props.elevenlabsVoices}
        elevenlabsVoiceId={props.elevenlabsVoiceId}
        voicesLoading={props.voicesLoading}
        voiceDiagnostics={props.voiceDiagnostics}
        voiceProviderStatus={props.voiceProviderStatus}
        saveMessage={props.voiceSettingsMsg}
        onPresetChange={props.onVoicePresetChange}
        onVoiceGenderChange={props.onVoiceGenderChange}
        onVoiceSpeedChange={props.onVoiceSpeedChange}
        onElevenlabsVoiceChange={props.onElevenlabsVoiceChange}
        onPreview={props.onPreviewVoice}
        onStopPreview={props.onStopPreviewVoice}
        onSave={props.onSaveVoice}
      />

      {props.settingsMessage && <p className="text-xs text-[#22d3ee]">{props.settingsMessage}</p>}
      {props.success && <p className="text-xs text-[#22c55e]">{props.success}</p>}
      {props.error && <p className="text-xs text-red-400">{props.error}</p>}
    </div>
  );
}
