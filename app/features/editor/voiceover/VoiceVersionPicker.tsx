"use client";

import { R365Button } from "@/app/components/R365Button";

type Props = {
  versionA?: string;
  versionB?: string;
  versionC?: string;
  onUse: (value: string) => void;
};

export function VoiceVersionPicker({ versionA, versionB, versionC, onUse }: Props) {
  const rows = [
    { key: "A", label: "Version A · Journalist default", text: versionA },
    { key: "B", label: "Version B · Punchier", text: versionB },
    { key: "C", label: "Version C · Fast short-form", text: versionC },
  ].filter((r) => (r.text ?? "").trim().length > 0);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Version picker</p>
      {rows.map((r) => (
        <div key={r.key} className="rounded-md border border-[#1f2d26] bg-black/40 p-2 space-y-2">
          <p className="text-xs font-semibold text-slate-300">{r.label}</p>
          <p className="text-sm text-slate-200 line-clamp-3">{r.text}</p>
          <R365Button variant="ghost" onClick={() => onUse(r.text ?? "")}>Use this version</R365Button>
        </div>
      ))}
    </div>
  );
}
