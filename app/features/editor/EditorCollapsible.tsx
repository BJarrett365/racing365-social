"use client";

import { useId, useState, type ReactNode } from "react";

export function EditorCollapsible({
  title,
  defaultOpen = false,
  children,
  className = "",
  /** When true, render children only (e.g. inside a parent tab panel). */
  unstyled = false,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  unstyled?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId().replace(/:/g, "");

  if (unstyled) {
    return <div className={`min-w-0 ${className}`}>{children}</div>;
  }
  const panelId = `editor-collapsible-${uid}`;
  const btnId = `${panelId}-btn`;

  return (
    <section
      className={`flex flex-col rounded-xl border ${className}`}
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-muted)" }}
    >
      <button
        type="button"
        id={btnId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">{title}</h2>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-sm leading-none text-[#eab308]"
          style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--surface)" }}
          aria-hidden
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={btnId} className="flex-1 p-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
