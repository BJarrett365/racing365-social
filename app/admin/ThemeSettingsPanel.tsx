"use client";

import { Panel } from "@/app/components/Panel";
import { useTheme, type ThemeMode } from "@/app/components/ThemeProvider";

const themeOptions: Array<{ id: ThemeMode; label: string; description: string }> = [
  { id: "light", label: "Light", description: "Use the bright admin and studio theme." },
  { id: "dark", label: "Dark", description: "Use the dark production control-room theme." },
  { id: "system", label: "System", description: "Follow the operating system preference." },
];

export function ThemeSettingsPanel() {
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <Panel title="Theme">
      <p className="text-sm text-slate-400">
        Choose how Planet Sport Studio appears across dashboard, admin, reports, studios and editor screens.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {themeOptions.map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className={`rounded-xl border p-4 text-left transition ${
                active ? "border-[#eab308] bg-[#eab308]/10 ring-2 ring-[#eab308]/30" : "border-[#1f2d26] bg-[#0a0e0c] hover:border-[#22c55e]/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{opt.label}</p>
                {active ? (
                  <span className="rounded-full bg-[#eab308] px-2 py-0.5 text-xs font-bold text-black">Active</span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{opt.description}</p>
              <div className="mt-3 space-y-1.5">
                <div className="h-2 rounded" style={{ background: "var(--bg-elevated)" }} />
                <div className="h-2 rounded" style={{ background: "var(--surface-muted)" }} />
                <div className="h-2 w-2/3 rounded" style={{ background: "var(--primary-soft)" }} />
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Active theme: <span className="font-semibold text-slate-300">{mode}</span> (resolved: {resolvedTheme})
      </p>
    </Panel>
  );
}
