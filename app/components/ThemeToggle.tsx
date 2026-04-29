"use client";

import { useTheme, type ThemeMode } from "@/app/components/ThemeProvider";

export function ThemeToggle() {
  const { mode, resolvedTheme, setMode, themeReady } = useTheme();

  const options: Array<{ id: ThemeMode; label: string }> = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "System" },
  ];

  if (!themeReady) {
    return (
      <div
        className="flex h-[38px] min-w-[204px] items-center gap-1 rounded-lg border p-1"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="flex items-center gap-1 rounded-lg border p-1 transition-[border-color,background-color] duration-200"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
      }}
      role="group"
      aria-label="Theme"
    >
      {options.map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMode(opt.id)}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:pointer-events-none disabled:opacity-40"
            style={{
              background: active ? "var(--primary-soft)" : "transparent",
              color: active ? "var(--primary)" : "var(--text-secondary)",
            }}
            aria-pressed={active}
            title={opt.id === "system" ? `Follow OS (${resolvedTheme})` : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
