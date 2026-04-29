import fs from "fs";
import { RESTREAM_TOKENS_FILE, LIVE_CONTROL_DATA_DIR } from "@/features/live-control/lib/constants";

export type RestreamStoredTokens = {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when access token expires (best-effort). */
  accessExpiresAtMs?: number;
  updatedAt: string;
};

function ensureDir() {
  fs.mkdirSync(LIVE_CONTROL_DATA_DIR, { recursive: true });
}

export function readRestreamTokens(): RestreamStoredTokens | null {
  try {
    const raw = fs.readFileSync(RESTREAM_TOKENS_FILE, "utf-8");
    const j = JSON.parse(raw) as RestreamStoredTokens;
    if (!j.accessToken || !j.refreshToken) return null;
    return j;
  } catch {
    return null;
  }
}

export function writeRestreamTokens(next: RestreamStoredTokens): void {
  ensureDir();
  fs.writeFileSync(RESTREAM_TOKENS_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export function clearRestreamTokens(): void {
  try {
    fs.unlinkSync(RESTREAM_TOKENS_FILE);
  } catch {
    /* noop */
  }
}
