import path from "path";
import { ProjectStorageService } from "@/lib/podcast-template/project-storage-service";
import { ScriptParserService } from "@/lib/podcast-template/script-parser-service";
import { UrlImportService } from "@/lib/podcast-template/url-import-service";
import { ElevenLabsGenerationService } from "@/lib/podcast-template/elevenlabs-generation-service";
import { AudioAssemblyService } from "@/lib/podcast-template/audio-assembly-service";
import type { PodcastProject } from "@/types/podcast-template";

function newHistoryId() {
  return `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class PodcastTemplateService {
  readonly storage = new ProjectStorageService();
  readonly parser = new ScriptParserService();
  readonly importer = new UrlImportService();
  readonly generator = new ElevenLabsGenerationService();
  readonly assembler = new AudioAssemblyService();

  async importUrlDraft(url: string) {
    return this.importer.importFromUrl(url);
  }

  async parseScript(project: PodcastProject): Promise<PodcastProject> {
    const parsed = this.parser.parse({
      script: project.rawScript,
      existingSpeakers: project.speakers,
    });
    if (parsed.errors.length) throw new Error(parsed.errors.join(" "));
    const next: PodcastProject = {
      ...project,
      speakers: parsed.speakers,
      segments: parsed.segments,
    };
    return this.storage.upsert(next);
  }

  async generateAudio(project: PodcastProject): Promise<PodcastProject> {
    const generated = await this.generator.generate(project);
    const speechRel =
      generated.segmentAudioRels.length === 1
        ? generated.segmentAudioRels[0]!
        : await this.assembler.concatMp3(
            generated.segmentAudioRels,
            `audio/podcast-template/${project.id}/speech-${Date.now()}.mp3`,
          );
    const finalRel = await this.assembler.assembleWithMusic({
      speechRel,
      outputRel: `audio/podcast-template/${project.id}/final-${Date.now()}.mp3`,
      introMusicRel: project.introMusicRel,
      outroMusicRel: project.outroMusicRel,
      speechVolume: project.settings.speechVolume,
      musicVolume: project.settings.musicVolume,
      fadeInSec: project.settings.musicFadeInSec,
      fadeOutSec: project.settings.musicFadeOutSec,
    });
    const historyEntry: PodcastProject["generationHistory"][number] = {
      id: newHistoryId(),
      createdAt: new Date().toISOString(),
      mode: generated.mode,
      status: "success",
      outputAudioRel: finalRel,
      message: `Generated with ${generated.mode === "dialogue" ? "dialogue API" : "per-line fallback"}`,
    };
    const withTiming = await this.attachChapterTimestamps(project);
    const saved = await this.storage.addHistory(
      project.id,
      historyEntry,
      finalRel,
      withTiming?.segments ?? project.segments,
    );
    if (!saved) throw new Error("Project not found after generation");
    return saved;
  }

  async exportProject(project: PodcastProject): Promise<{ downloadRel: string; filename: string }> {
    if (!project.outputAudioRel) throw new Error("Generate audio before export");
    const base = project.title
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const filename = `${base || project.id}-podcast.mp3`;
    const rel = project.outputAudioRel.split(path.sep).join("/");
    return { downloadRel: rel, filename };
  }

  private async attachChapterTimestamps(project: PodcastProject): Promise<PodcastProject> {
    // TODO: Could be upgraded with ffprobe + segment-level duration mapping.
    if (!project.chapters.length || !project.segments.length) return project;
    const segMap = new Map(project.segments.map((s) => [s.id, s.order]));
    const ordered = [...project.segments].sort((a, b) => a.order - b.order);
    const avgMs = 3200;
    const chapters = project.chapters.map((c) => {
      const idx = c.basedOnSegmentId ? segMap.get(c.basedOnSegmentId) ?? 0 : 0;
      return { ...c, startMs: Math.max(0, (idx ?? 0) * avgMs) };
    });
    return { ...project, chapters, segments: ordered };
  }
}
