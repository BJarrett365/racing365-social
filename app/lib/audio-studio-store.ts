import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { outputAudioDir, projectRoot } from "@/app/lib/paths";

export type AudioProviderName = "openai" | "elevenlabs";

export type AudioProject = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived";
};

export type AudioFile = {
  id: string;
  projectId: string;
  title: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  relPath: string;
  source: "upload" | "recording" | "generated" | "edited" | "isolated";
  createdAt: string;
};

export type TranscriptSpeaker = {
  id: string;
  transcriptId: string;
  label: string;
  displayName: string;
};

export type TranscriptSegment = {
  id: string;
  speakerId?: string;
  start?: number;
  end?: number;
  text: string;
};

export type Transcript = {
  id: string;
  projectId: string;
  audioFileId?: string;
  provider: "openai";
  text: string;
  language?: string;
  segments: TranscriptSegment[];
  speakers: TranscriptSpeaker[];
  createdAt: string;
  updatedAt: string;
};

export type AudioNote = {
  id: string;
  projectId: string;
  transcriptId?: string;
  audioFileId?: string;
  title: string;
  content?: string;
  summary: string;
  cleanNotes: string[];
  keyPoints: string[];
  actionPoints: string[];
  quotes: string[];
  headlines: string[];
  socialPostIdeas: string[];
  createdAt: string;
  updatedAt?: string;
};

export type VoiceProfile = {
  id: string;
  name: string;
  provider: "elevenlabs";
  voiceId: string;
  permissionConfirmed: boolean;
  sampleFileIds: string[];
  createdAt: string;
};

export type GeneratedAudio = {
  id: string;
  projectId: string;
  title?: string;
  provider: AudioProviderName;
  voiceId?: string;
  sourceText: string;
  relPath: string;
  mimeType: string;
  createdAt: string;
};

export type LanguageVersion = {
  id: string;
  projectId: string;
  sourceTranscriptId?: string;
  language: string;
  translatedText: string;
  generatedAudioId?: string;
  createdAt: string;
};

export type AudioStudioStore = {
  projects: AudioProject[];
  files: AudioFile[];
  transcripts: Transcript[];
  notes: AudioNote[];
  voices: VoiceProfile[];
  generatedAudio: GeneratedAudio[];
  languageVersions: LanguageVersion[];
};

const STORE_NAME = "plexa-audio-studio";
const STORE_KEY = "audio-studio-store.json";
const LOCAL_DIR = path.join(projectRoot(), "data", "local");
const LOCAL_FILE = path.join(LOCAL_DIR, STORE_KEY);

export const emptyAudioStudioStore = (): AudioStudioStore => ({
  projects: [],
  files: [],
  transcripts: [],
  notes: [],
  voices: [],
  generatedAudio: [],
  languageVersions: [],
});

export function audioStudioId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugForAudioFile(name: string): string {
  const parsed = path.parse(name || "audio");
  const base = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "audio";
  const ext = parsed.ext.toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp3";
  return `${base}${ext}`;
}

export function audioStudioRelPath(projectId: string, fileName: string): string {
  return path.posix.join("audio", "audio-studio", projectId, fileName);
}

export function audioStudioAbsolutePath(relPath: string): string {
  const normalised = relPath.split(path.sep).join(path.posix.sep);
  if (normalised.includes("..") || !normalised.startsWith("audio/audio-studio/")) {
    throw new Error("Invalid Audio Studio path");
  }
  return path.join(outputAudioDir(), normalised.replace(/^audio\//, ""));
}

export async function writeAudioStudioFile(relPath: string, bytes: Buffer): Promise<void> {
  const fullPath = audioStudioAbsolutePath(relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, bytes);
}

export async function readAudioStudioFile(relPath: string): Promise<Buffer> {
  return fs.readFile(audioStudioAbsolutePath(relPath));
}

export async function readAudioStudioStore(): Promise<AudioStudioStore> {
  if (shouldUseNetlifyBlobStore()) {
    const blobStore = await readJsonBlob<AudioStudioStore>(STORE_NAME, STORE_KEY);
    return { ...emptyAudioStudioStore(), ...(blobStore ?? {}) };
  }

  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return { ...emptyAudioStudioStore(), ...JSON.parse(raw) };
  } catch {
    return emptyAudioStudioStore();
  }
}

export async function writeAudioStudioStore(store: AudioStudioStore): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(STORE_NAME, STORE_KEY, store);
    return;
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function updateAudioStudioStore(
  updater: (store: AudioStudioStore) => AudioStudioStore | void,
): Promise<AudioStudioStore> {
  const store = await readAudioStudioStore();
  const next = updater(store) ?? store;
  await writeAudioStudioStore(next);
  return next;
}

export async function ensureAudioProject(projectId?: string, title = "Audio Studio Project"): Promise<AudioProject> {
  const id = projectId?.trim() || audioStudioId("aud_proj");
  const now = new Date().toISOString();
  let project: AudioProject | undefined;
  await updateAudioStudioStore((store) => {
    project = store.projects.find((item) => item.id === id);
    if (!project) {
      project = { id, title, createdAt: now, updatedAt: now, status: "active" };
      store.projects.unshift(project);
    } else {
      project.updatedAt = now;
    }
  });
  return project!;
}
