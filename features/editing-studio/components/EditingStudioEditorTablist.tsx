"use client";

import { useCallback, useRef } from "react";
import { EDITOR_TAB_IDS, type EditorTabId } from "@/features/editing-studio/editor/editor-types";

type Props = {
  activeTab: EditorTabId;
  onTabChange: (tab: EditorTabId) => void;
};

const TAB_LABEL: Record<EditorTabId, string> = {
  copy: "Copy",
  media: "Media",
  preview: "Preview",
  variants: "Variants",
  settings: "Settings",
};

/**
 * Main editor section tabs with arrow-key navigation (WAI-ARIA tab pattern).
 */
export function EditingStudioEditorTablist({ activeTab, onTabChange }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setTabRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    tabRefs.current[index] = el;
  }, []);

  const focusIndex = useCallback((index: number) => {
    requestAnimationFrame(() => {
      tabRefs.current[index]?.focus();
    });
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const cur = EDITOR_TAB_IDS.indexOf(activeTab);
      if (cur < 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (cur + 1) % EDITOR_TAB_IDS.length;
        onTabChange(EDITOR_TAB_IDS[next]!);
        focusIndex(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = (cur - 1 + EDITOR_TAB_IDS.length) % EDITOR_TAB_IDS.length;
        onTabChange(EDITOR_TAB_IDS[next]!);
        focusIndex(next);
      } else if (e.key === "Home") {
        e.preventDefault();
        onTabChange(EDITOR_TAB_IDS[0]!);
        focusIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        const last = EDITOR_TAB_IDS.length - 1;
        onTabChange(EDITOR_TAB_IDS[last]!);
        focusIndex(last);
      }
    },
    [activeTab, focusIndex, onTabChange],
  );

  return (
    <div
      className="flex flex-wrap gap-1 rounded-xl border p-1"
      style={{ borderColor: "var(--border)" }}
      role="tablist"
      aria-label="Editor sections"
      onKeyDown={onKeyDown}
    >
      {EDITOR_TAB_IDS.map((tab, index) => {
        const selected = activeTab === tab;
        return (
          <button
            key={tab}
            ref={(el) => setTabRef(index, el)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`editing-tabpanel-${tab}`}
            id={`editing-tab-${tab}`}
            tabIndex={selected ? 0 : -1}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              selected ? "text-[color:var(--text-primary)]" : "text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
            style={selected ? { background: "var(--surface-hover)" } : undefined}
            onClick={() => onTabChange(tab)}
          >
            {TAB_LABEL[tab]}
          </button>
        );
      })}
    </div>
  );
}
