/**
 * Cross-module handoff from Editing Studio → Live Control (no shared project model).
 */
import type { LiveHandoffIntent } from "@/features/live-control/types/live-session";

export type { LiveHandoffIntent };

/**
 * Payload produced server-side from an Editing Studio project for Live session creation.
 */
export type LiveSessionEditingHandoff = {
  editingProjectId: string;
  intent: LiveHandoffIntent;
  /** Live session title (display + operator context). */
  title: string;
  summary?: string;
  brand?: string;
  sourceUrl?: string;
  /** Stable references: `rel:…`, `url:…`, or asset `id:…`. */
  assetRefs: string[];
  /** Suggested on-air headline (from copy variant or public headline). */
  headline?: string;
};
