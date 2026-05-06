import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { projectRoot } from "@/app/lib/paths";
import type { PlexaUser } from "@/app/lib/auth/types";

export type GuestSessionSpeaker = {
  id: string;
  displayName: string;
  role: string;
  languageIn: string;
  languageOut: string;
  assignedUserId?: string;
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

export type GuestSessionParticipant = {
  userId: string;
  name: string;
  email: string;
  role: "host" | "guest";
  speakerId?: string;
  displayName: string;
  languageIn: string;
  languageOut: string;
  recordingConsentAcceptedAt?: string;
  recordingConsentText?: string;
  recordingConsentVersion?: string;
  joinedAt: string;
  updatedAt: string;
  lastTrackAt?: string;
};

export type AudioGuestSession = {
  id: string;
  projectId: string;
  title: string;
  hostUserId: string;
  hostName?: string;
  hostEmail?: string;
  status: "open" | "closed";
  dailyRoomName?: string;
  dailyRoomUrl?: string;
  dailyRoomCreatedAt?: string;
  speakers: GuestSessionSpeaker[];
  participants?: GuestSessionParticipant[];
  tracks: GuestSessionTrack[];
  createdAt: string;
  updatedAt: string;
};

export const RECORDING_CONSENT_VERSION = "recording-consent-v1";
export const RECORDING_CONSENT_TEXT =
  "This Plexa meeting may be recorded. Audio may be used to create transcripts, summaries, notes, quotes, and follow-up content. By continuing, you confirm you understand and consent to being recorded for this meeting.";

type GuestSessionsStore = {
  sessions: AudioGuestSession[];
};

const SESSIONS_FILE = path.join(projectRoot(), "data", "local", "audio-guest-sessions.json");
const BLOB_STORE_NAME = "plexa-audio-guest-sessions";
const BLOB_STORE_KEY = "audio-guest-sessions.json";
const BLOB_SESSION_PREFIX = "sessions";

export function audioGuestSessionId(): string {
  return `guest_session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function audioGuestTrackId(): string {
  return `guest_track_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function participantFromUser(
  user: Pick<PlexaUser, "id" | "name" | "email">,
  role: "host" | "guest",
  options: { speakerId?: string; languageIn?: string; languageOut?: string; now?: string } = {},
): GuestSessionParticipant {
  const now = options.now ?? new Date().toISOString();
  const name = user.name?.trim() || user.email;
  return {
    userId: user.id,
    name,
    email: user.email,
    role,
    speakerId: options.speakerId,
    displayName: name,
    languageIn: options.languageIn || "en",
    languageOut: options.languageOut || "en",
    joinedAt: now,
    updatedAt: now,
  };
}

export function upsertSessionParticipant(
  session: AudioGuestSession,
  participant: GuestSessionParticipant,
): AudioGuestSession {
  const participants = Array.isArray(session.participants) ? session.participants : [];
  const index = participants.findIndex((item) => item.userId === participant.userId);
  const nextParticipant = index >= 0
    ? { ...participants[index], ...participant, joinedAt: participants[index].joinedAt, updatedAt: participant.updatedAt }
    : participant;
  session.participants = index >= 0
    ? participants.map((item, itemIndex) => itemIndex === index ? nextParticipant : item)
    : [...participants, nextParticipant];
  return session;
}

export function participantForUser(session: AudioGuestSession, userId: string): GuestSessionParticipant | undefined {
  return session.participants?.find((participant) => participant.userId === userId);
}

export async function readAudioGuestSessions(): Promise<GuestSessionsStore> {
  if (shouldUseNetlifyBlobStore()) {
    const blobStore = await readJsonBlob<GuestSessionsStore>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    return { sessions: Array.isArray(blobStore?.sessions) ? blobStore.sessions : [] };
  }

  try {
    const raw = await fs.readFile(SESSIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<GuestSessionsStore>;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return { sessions: [] };
  }
}

export async function writeAudioGuestSessions(store: GuestSessionsStore): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, store);
    await Promise.all(store.sessions.map((session) => writeJsonBlob(BLOB_STORE_NAME, sessionBlobKey(session.id), session)));
    return;
  }

  await fs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function readAudioGuestSession(sessionId: string): Promise<AudioGuestSession | null> {
  const id = normaliseSessionId(sessionId);
  if (!id) return null;

  if (shouldUseNetlifyBlobStore()) {
    const session = await readJsonBlob<AudioGuestSession>(BLOB_STORE_NAME, sessionBlobKey(id));
    if (session?.id === id) return session;
  }

  const store = await readAudioGuestSessions();
  return store.sessions.find((session) => session.id === id) ?? null;
}

export async function upsertAudioGuestSession(session: AudioGuestSession): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, sessionBlobKey(session.id), session);
  }

  await updateAudioGuestSessions((store) => {
    const existingIndex = store.sessions.findIndex((item) => item.id === session.id);
    if (existingIndex >= 0) {
      store.sessions[existingIndex] = session;
    } else {
      store.sessions.unshift(session);
    }
  });
}

export async function updateAudioGuestSession(
  sessionId: string,
  updater: (session: AudioGuestSession) => AudioGuestSession | void,
): Promise<AudioGuestSession | null> {
  const session = await readAudioGuestSession(sessionId);
  if (!session) return null;
  const next = updater(session) ?? session;
  next.updatedAt = new Date().toISOString();
  await upsertAudioGuestSession(next);
  return next;
}

export async function updateAudioGuestSessions(
  updater: (store: GuestSessionsStore) => GuestSessionsStore | void,
): Promise<GuestSessionsStore> {
  const store = await readAudioGuestSessions();
  const next = updater(store) ?? store;
  await writeAudioGuestSessions(next);
  return next;
}

function normaliseSessionId(sessionId: string): string {
  const id = String(sessionId || "").trim();
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : "";
}

function sessionBlobKey(sessionId: string): string {
  const id = normaliseSessionId(sessionId);
  if (!id) throw new Error("Invalid guest session id");
  return `${BLOB_SESSION_PREFIX}/${id}.json`;
}
