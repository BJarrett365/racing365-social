import fs from "fs";
import path from "path";
import { projectRoot } from "@/app/lib/paths";

export type AdminStoredSettings = {
  elevenlabsApiKey?: string;
  openaiApiKey?: string;
  /** Runway developer API secret (same value as RUNWAYML_API_SECRET). */
  runwaymlApiKey?: string;
  /** Restream OAuth app (Developer → Apps). */
  restreamClientId?: string;
  restreamClientSecret?: string;
  /** Mux access token (Settings → Access Tokens). */
  muxTokenId?: string;
  muxTokenSecret?: string;
  /** Mux webhook signing secret (dashboard → webhooks) — optional but recommended for production. */
  muxWebhookSigningSecret?: string;
  /** Optional alternative live provider. */
  livepeerApiKey?: string;
  ffmpegPath?: string;
  openaiTtsVoice?: string;
  openaiTtsModel?: string;
  elevenlabsVoiceId?: string;
  elevenlabsModel?: string;
  deeplApiKey?: string;
  deeplApiUrl?: string;
  languageProviderMode?: "openai" | "deepl" | "deepl-openai";
  languageOpenaiModel?: string;
  updatedAt?: string;
};

const LOCAL_DIR = path.join(projectRoot(), "data", "local");
const SETTINGS_FILE = path.join(LOCAL_DIR, "admin-settings.json");

function ensureDir() {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

export function readStoredSettings(): AdminStoredSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw) as AdminStoredSettings;
  } catch {
    return {};
  }
}

export function writeStoredSettings(next: AdminStoredSettings): void {
  ensureDir();
  const payload: AdminStoredSettings = {
    ...next,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

/** Merge partial updates; omit or empty string can clear a key when `clearKeys` lists it */
export function mergeStoredSettings(
  partial: Partial<AdminStoredSettings>,
  clearKeys: (keyof AdminStoredSettings)[] = [],
): AdminStoredSettings {
  const cur = readStoredSettings();
  const next = { ...cur };
  for (const k of clearKeys) {
    delete next[k];
  }
  for (const [k, v] of Object.entries(partial)) {
    const key = k as keyof AdminStoredSettings;
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    (next as Record<string, unknown>)[key] = v;
  }
  writeStoredSettings(next);
  return next;
}

/** Standard env name → process.env wins, then local JSON */
export function getServerSecret(envName: string): string | undefined {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  const s = readStoredSettings();
  const map: Record<string, keyof AdminStoredSettings> = {
    ELEVENLABS_API_KEY: "elevenlabsApiKey",
    OPENAI_API_KEY: "openaiApiKey",
    RUNWAYML_API_SECRET: "runwaymlApiKey",
    FFMPEG_PATH: "ffmpegPath",
    RESTREAM_CLIENT_ID: "restreamClientId",
    RESTREAM_CLIENT_SECRET: "restreamClientSecret",
    MUX_TOKEN_ID: "muxTokenId",
    MUX_TOKEN_SECRET: "muxTokenSecret",
    MUX_WEBHOOK_SIGNING_SECRET: "muxWebhookSigningSecret",
    LIVEPEER_API_KEY: "livepeerApiKey",
    DEEPL_API_KEY: "deeplApiKey",
  };
  const fileKey = map[envName];
  if (!fileKey) return undefined;
  const v = s[fileKey];
  return typeof v === "string" ? v.trim() : undefined;
}

export function getStoredVoiceOption(
  envName: string,
  fileKey: keyof AdminStoredSettings,
): string | undefined {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  const s = readStoredSettings();
  const v = s[fileKey];
  return typeof v === "string" ? v.trim() : undefined;
}

export function settingsFilePath(): string {
  return SETTINGS_FILE;
}
