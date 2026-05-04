import fs from "fs/promises";
import path from "path";
import { projectRoot } from "@/app/lib/paths";

export type GuestSessionSpeaker = {
  id: string;
  displayName: string;
  role: string;
  languageIn: string;
  languageOut: string;
};

export type GuestSessionTrack = {
  id: string;
  userId: string;
  speakerId?: string;
  displayName: string;
  languageIn: string;
  languageOut: string;
  audioFileId: string;
  relPath: string;
  createdAt: string;
};

export type AudioGuestSession = {
  id: string;
  projectId: string;
  title: string;
  hostUserId: string;
  status: "open" | "closed";
  speakers: GuestSessionSpeaker[];
  tracks: GuestSessionTrack[];
  createdAt: string;
  updatedAt: string;
};

type GuestSessionsStore = {
  sessions: AudioGuestSession[];
};

const SESSIONS_FILE = path.join(projectRoot(), "data", "local", "audio-guest-sessions.json");

export function audioGuestSessionId(): string {
  return `guest_session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function audioGuestTrackId(): string {
  return `guest_track_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function readAudioGuestSessions(): Promise<GuestSessionsStore> {
  try {
    const raw = await fs.readFile(SESSIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<GuestSessionsStore>;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return { sessions: [] };
  }
}

export async function writeAudioGuestSessions(store: GuestSessionsStore): Promise<void> {
  await fs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function updateAudioGuestSessions(
  updater: (store: GuestSessionsStore) => GuestSessionsStore | void,
): Promise<GuestSessionsStore> {
  const store = await readAudioGuestSessions();
  const next = updater(store) ?? store;
  await writeAudioGuestSessions(next);
  return next;
}
