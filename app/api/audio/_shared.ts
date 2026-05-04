import { NextResponse } from "next/server";
import { generateAudioTitleFromFile } from "@/app/lib/audio-studio-ai";
import {
  audioStudioId,
  audioStudioRelPath,
  ensureAudioProject,
  slugForAudioFile,
  updateAudioStudioStore,
  writeAudioStudioFile,
  type AudioFile,
  type GeneratedAudio,
  type GeneratedAudioTool,
} from "@/app/lib/audio-studio-store";

export const supportedAudioTypes = new Set([
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const supportedAudioExtensions = new Set([".aac", ".m4a", ".mp3", ".mp4", ".wav", ".webm"]);
const generatedAudioTools = new Set<GeneratedAudioTool>([
  "text-to-speech",
  "language",
  "voice-changer",
  "voice-isolator",
  "elevenlabs-editing",
]);

export function jsonError(error: unknown, fallback = "Audio Studio request failed", status = 500) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export function normaliseGeneratedAudioTool(value: unknown, fallback: GeneratedAudioTool = "text-to-speech"): GeneratedAudioTool {
  const tool = String(value ?? "").trim();
  return generatedAudioTools.has(tool as GeneratedAudioTool) ? tool as GeneratedAudioTool : fallback;
}

export async function audioFileFromForm(form: FormData): Promise<File> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("file is required");
  }
  if (file.size > 200 * 1024 * 1024) {
    throw new Error("Audio file must be under 200MB");
  }
  if (!isSupportedAudioFile(file)) {
    throw new Error("Unsupported audio format. Use mp3, wav, m4a, mp4 or browser recording audio.");
  }
  return file;
}

function isSupportedAudioFile(file: File): boolean {
  const mimeType = file.type.toLowerCase().split(";")[0]?.trim();
  if (mimeType && supportedAudioTypes.has(mimeType)) return true;
  if (mimeType?.startsWith("audio/")) return true;

  const name = file.name.toLowerCase();
  return Array.from(supportedAudioExtensions).some((extension) => name.endsWith(extension));
}

export async function saveAudioFileFromForm(
  form: FormData,
  source: AudioFile["source"],
): Promise<AudioFile> {
  const file = await audioFileFromForm(form);
  const projectId = String(form.get("projectId") ?? "").trim() || undefined;
  const manualTitle = String(form.get("title") ?? "").trim();
  const language = String(form.get("language") ?? "").trim() || undefined;
  const fallbackTitle = manualTitle || titleFromFileName(file.name || "Audio recording");
  const shouldGenerateTitle = String(form.get("generateTitle") ?? "") === "true";
  let title = fallbackTitle;
  if (shouldGenerateTitle) {
    try {
      title = await generateAudioTitleFromFile(file, language) || fallbackTitle;
    } catch {
      title = fallbackTitle;
    }
  }
  const project = await ensureAudioProject(projectId);
  const id = audioStudioId("aud_file");
  const fileName = `${id}-${slugForAudioFile(file.name || "audio.webm")}`;
  const relPath = audioStudioRelPath(project.id, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeAudioStudioFile(relPath, bytes, file.type || "application/octet-stream");

  const record: AudioFile = {
    id,
    projectId: project.id,
    title,
    name: fileName,
    originalName: file.name || fileName,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    relPath,
    source,
    createdAt: new Date().toISOString(),
  };

  await updateAudioStudioStore((store) => {
    store.files.unshift(record);
    const storedProject = store.projects.find((item) => item.id === project.id);
    if (storedProject) storedProject.updatedAt = new Date().toISOString();
  });

  return record;
}

export async function saveGeneratedAudio(params: {
  projectId?: string;
  title?: string;
  provider: "openai" | "elevenlabs";
  sourceTool?: GeneratedAudio["sourceTool"];
  voiceId?: string;
  sourceText: string;
  bytes: Buffer;
  mimeType: string;
  extension?: string;
}): Promise<GeneratedAudio> {
  const project = await ensureAudioProject(params.projectId);
  const id = audioStudioId("aud_gen");
  const ext = params.extension || ".mp3";
  const relPath = audioStudioRelPath(project.id, `${id}-${params.provider}${ext}`);
  await writeAudioStudioFile(relPath, params.bytes, params.mimeType);
  const record: GeneratedAudio = {
    id,
    projectId: project.id,
    title: params.title,
    provider: params.provider,
    sourceTool: params.sourceTool ?? "text-to-speech",
    voiceId: params.voiceId,
    sourceText: params.sourceText.slice(0, 12000),
    relPath,
    mimeType: params.mimeType,
    createdAt: new Date().toISOString(),
  };
  await updateAudioStudioStore((store) => {
    store.generatedAudio.unshift(record);
  });
  return record;
}

export function normaliseSpeed(value: unknown): number {
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.min(2, Math.max(0.5, speed)) : 1;
}

function titleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Audio recording";
}
