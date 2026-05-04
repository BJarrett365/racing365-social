import { NextResponse } from "next/server";
import {
  deleteAudioStudioFile,
  readAudioStudioStore,
  updateAudioStudioStore,
  type AudioFile,
  type GeneratedAudio,
} from "@/app/lib/audio-studio-store";
import { jsonError } from "../_shared";

type GeneratedAudioSourceTool = NonNullable<GeneratedAudio["sourceTool"]>;
type MediaKindFilter = "all" | "files" | "generated";

type ProjectMediaItem = {
  id: string;
  kind: "file" | "generated";
  projectId: string;
  title: string;
  name: string;
  originalName: string;
  source: AudioFile["source"] | "generated";
  mimeType: string;
  size?: number;
  relPath: string;
  createdAt: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId")?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    const kindFilter = normaliseKindFilter(searchParams.get("kind"));
    const sourceTool = normaliseGeneratedSourceTool(searchParams.get("sourceTool"));

    const store = await readAudioStudioStore();
    const files: ProjectMediaItem[] = kindFilter === "generated"
      ? []
      : store.files
        .filter((file) => file.projectId === projectId)
        .map((file) => ({
          id: file.id,
          kind: "file",
          projectId: file.projectId,
          title: file.title || file.originalName,
          name: file.name,
          originalName: file.originalName,
          source: file.source,
          mimeType: file.mimeType,
          size: file.size,
          relPath: file.relPath,
          createdAt: file.createdAt,
        }));
    const generated: ProjectMediaItem[] = kindFilter === "files"
      ? []
      : store.generatedAudio
      .filter((audio) => audio.projectId === projectId && matchesGeneratedSourceTool(audio.sourceTool, sourceTool))
      .map((audio) => ({
        id: audio.id,
        kind: "generated",
        projectId: audio.projectId,
        title: audio.title || `${audio.provider} generated audio`,
        name: audio.relPath.split("/").pop() || audio.id,
        originalName: `${audio.provider} generated audio`,
        source: "generated",
        mimeType: audio.mimeType,
        relPath: audio.relPath,
        createdAt: audio.createdAt,
      }));

    return NextResponse.json({
      files: [...files, ...generated].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  } catch (error) {
    return jsonError(error, "Audio files lookup failed");
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json() as { id?: string; kind?: ProjectMediaItem["kind"] };
    const id = body.id?.trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    let relPath: string | undefined;
    await updateAudioStudioStore((store) => {
      const file = store.files.find((item) => item.id === id);
      const generated = store.generatedAudio.find((item) => item.id === id);
      relPath = file?.relPath || generated?.relPath;

      store.files = store.files.filter((item) => item.id !== id);
      store.generatedAudio = store.generatedAudio.filter((item) => item.id !== id);
      store.transcripts = store.transcripts.filter((item) => item.audioFileId !== id);
      store.notes = store.notes.filter((item) => item.audioFileId !== id);
      store.languageVersions = store.languageVersions.map((item) =>
        item.generatedAudioId === id ? { ...item, generatedAudioId: undefined } : item,
      );
    });

    if (relPath) {
      await deleteAudioStudioFile(relPath);
    }

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    return jsonError(error, "Audio delete failed", 400);
  }
}

function normaliseKindFilter(value: string | null): MediaKindFilter {
  if (value === "files" || value === "generated") return value;
  return "all";
}

function normaliseGeneratedSourceTool(value: string | null): GeneratedAudioSourceTool | undefined {
  if (value === "text-to-speech" || value === "language" || value === "voice-changer" || value === "voice-isolator") return value;
  return undefined;
}

function matchesGeneratedSourceTool(sourceTool: GeneratedAudio["sourceTool"], filter: GeneratedAudioSourceTool | undefined): boolean {
  if (!filter) return true;
  if (sourceTool === filter) return true;
  return filter === "text-to-speech" && !sourceTool;
}
