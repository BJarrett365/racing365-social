"use client";

import { R365Button } from "@/app/components/R365Button";

type Props = {
  open: boolean;
  prompt: string;
  busy?: boolean;
  onToggle: () => void;
  onPromptChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
};

export function AiPromptPanel({ open, prompt, busy, onToggle, onPromptChange, onSave, onReset }: Props) {
  return (
    <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        onClick={onToggle}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          AI Prompt (Editable)
        </span>
        <span className="text-xs text-[#eab308]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-[#1f2d26] p-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Journalist prompt
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-lg border border-[#1f2d26] bg-black px-3 py-2 text-xs text-slate-200"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <R365Button onClick={onSave} disabled={busy}>
              Save Prompt
            </R365Button>
            <R365Button variant="ghost" onClick={onReset} disabled={busy}>
              Reset
            </R365Button>
          </div>
        </div>
      )}
    </div>
  );
}
