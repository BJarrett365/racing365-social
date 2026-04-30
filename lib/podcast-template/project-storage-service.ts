import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import {
  PODCAST_DEFAULT_GENERATION_SETTINGS,
  PODCAST_DEFAULT_SCRIPT_CONVERSION_PROMPT,
  PODCAST_DEFAULT_VOICE_SETTINGS,
  PODCAST_PROJECTS_FILE,
} from "@/lib/podcast-template/constants";
import type {
  PodcastProject,
  PodcastScriptSegment,
  PodcastSpeaker,
} from "@/types/podcast-template";

type PodcastProjectsFile = {
  projects: Record<string, PodcastProject>;
};
const BLOB_STORE_NAME = "plexa-podcast-template";
const BLOB_STORE_KEY = "podcast-template-projects.json";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function absFile() {
  return path.join(process.cwd(), PODCAST_PROJECTS_FILE);
}

async function readRaw(): Promise<PodcastProjectsFile> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<PodcastProjectsFile>(BLOB_STORE_NAME, BLOB_STORE_KEY);
    return data && data.projects ? data : { projects: {} };
  }

  try {
    const raw = await fs.readFile(absFile(), "utf-8");
    const parsed = JSON.parse(raw) as PodcastProjectsFile;
    return parsed && parsed.projects ? parsed : { projects: {} };
  } catch {
    return { projects: {} };
  }
}

async function writeRaw(data: PodcastProjectsFile): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, data);
    return;
  }

  const full = absFile();
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf-8");
}

function defaultSpeaker(): PodcastSpeaker {
  return {
    id: newId("speaker"),
    name: "HOST",
    role: "Host",
    voiceId: "",
    voiceSettings: { ...PODCAST_DEFAULT_VOICE_SETTINGS },
  };
}

export class ProjectStorageService {
  async list(): Promise<PodcastProject[]> {
    const data = await readRaw();
    return Object.values(data.projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<PodcastProject | null> {
    const data = await readRaw();
    return data.projects[id] ?? null;
  }

  createEmpty(): PodcastProject {
    const ts = nowIso();
    return {
      id: newId("podtpl"),
      title: "Untitled podcast project",
      sourceType: "url",
      importedText: "",
      importedSummary: "",
      scriptConversionPrompt: PODCAST_DEFAULT_SCRIPT_CONVERSION_PROMPT,
      rawScript: "",
      segments: [],
      speakers: [defaultSpeaker()],
      chapters: [],
      settings: { ...PODCAST_DEFAULT_GENERATION_SETTINGS },
      generationHistory: [],
      createdAt: ts,
      updatedAt: ts,
    };
  }

  async create(input?: Partial<PodcastProject>): Promise<PodcastProject> {
    const base = this.createEmpty();
    const merged: PodcastProject = {
      ...base,
      ...input,
      id: input?.id || base.id,
      speakers: input?.speakers?.length ? input.speakers : base.speakers,
      segments: input?.segments ?? base.segments,
      chapters: input?.chapters ?? base.chapters,
      settings: { ...base.settings, ...(input?.settings ?? {}) },
      scriptConversionPrompt: input?.scriptConversionPrompt ?? base.scriptConversionPrompt,
      generationHistory: input?.generationHistory ?? base.generationHistory,
      updatedAt: nowIso(),
    };
    const file = await readRaw();
    file.projects[merged.id] = merged;
    await writeRaw(file);
    return merged;
  }

  async upsert(project: PodcastProject): Promise<PodcastProject> {
    const file = await readRaw();
    const next: PodcastProject = {
      ...project,
      updatedAt: nowIso(),
      segments: [...(project.segments ?? [])].sort((a, b) => a.order - b.order),
    };
    file.projects[next.id] = next;
    await writeRaw(file);
    return next;
  }

  async addHistory(
    id: string,
    entry: PodcastProject["generationHistory"][number],
    outputAudioRel?: string,
    segments?: PodcastScriptSegment[],
  ): Promise<PodcastProject | null> {
    const p = await this.get(id);
    if (!p) return null;
    const next: PodcastProject = {
      ...p,
      outputAudioRel: outputAudioRel ?? p.outputAudioRel,
      segments: segments ?? p.segments,
      generationHistory: [entry, ...p.generationHistory].slice(0, 25),
      updatedAt: nowIso(),
    };
    await this.upsert(next);
    return next;
  }
}
