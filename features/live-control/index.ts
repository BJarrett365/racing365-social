/**
 * Plexa Live Control — public exports for app routes and future integrations.
 * Editing Studio links in via `/live/new?fromEditingProjectId=…` + handoff API (no merged routes).
 */
export type {
  LiveSession,
  LiveSessionProvider,
  LiveSessionStatus,
  LiveStreamMetadata,
  PlexaLiveSession,
} from "@/features/live-control/types/live-session";

export type { LiveSessionEditingHandoff } from "@/features/live-control/types/live-session-handoff";
