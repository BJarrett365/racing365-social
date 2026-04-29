import path from "path";
import { projectRoot } from "@/app/lib/paths";

export const LIVE_CONTROL_DATA_DIR = path.join(projectRoot(), "data", "local");
export const LIVE_SESSIONS_FILE = path.join(LIVE_CONTROL_DATA_DIR, "live-control-sessions.json");
export const RESTREAM_TOKENS_FILE = path.join(LIVE_CONTROL_DATA_DIR, "restream-oauth-tokens.json");
/** Persisted Mux live streams created via Live Control (provider integration). */
export const MUX_PROVIDER_STREAMS_FILE = path.join(LIVE_CONTROL_DATA_DIR, "mux-provider-streams.json");

/** Restream OAuth scopes used by Live Control. */
export const RESTREAM_OAUTH_SCOPES = [
  "profile.read",
  "channels.read",
  "channels.write",
  "stream.read",
].join(" ");
