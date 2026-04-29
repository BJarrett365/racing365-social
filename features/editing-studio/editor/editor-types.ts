import type { PlatformType } from "@/features/editing-studio/types/domain";

/** Centre editor tabs (shell only; content wired per tab). */
export type EditorTabId = "copy" | "media" | "preview" | "variants" | "settings";

export const EDITOR_TAB_IDS: readonly EditorTabId[] = [
  "copy",
  "media",
  "preview",
  "variants",
  "settings",
] as const;

export function isEditorTabId(value: string | null | undefined): value is EditorTabId {
  return value !== undefined && value !== null && (EDITOR_TAB_IDS as readonly string[]).includes(value);
}

/** Live preview target (subset of platforms on the project). */
export type PreviewPlatform = PlatformType;

export type SaveStatus = "idle" | "saving" | "saved" | "error";
