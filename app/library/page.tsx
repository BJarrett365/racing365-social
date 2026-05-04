import type { Metadata } from "next";
import { Suspense } from "react";
import path from "path";
import fs from "fs/promises";
import { LibraryClient } from "@/app/library/LibraryClient";
import type { ManifestEntry } from "@/app/lib/asset-manifest";
import { scanBackdropVideoRels } from "@/app/lib/scan-backdrop-videos";
import { scanLibraryBackgroundImageRels } from "@/app/lib/scan-library-background-images";
import { scanVoiceRecordingRels } from "@/app/lib/scan-voice-recordings";
import { assetsManifestPath, outputVideoDir } from "@/app/lib/paths";
import { BRAND_SHORTS, BRAND_SUITE, BRAND_TAGLINE } from "@/app/lib/brand";
import { readLibraryMetadataIndex } from "@/app/lib/library-metadata";
import { readAudioStudioStore } from "@/app/lib/audio-studio-store";
import { PODCAST_PROJECTS_FILE } from "@/lib/podcast-template/constants";
import type { PodcastProject } from "@/types/podcast-template";

type LibraryPodcastAudio = {
  projectId: string;
  title: string;
  outputAudioRel: string;
  updatedAt: string;
  sourceUrl?: string;
};

type LibraryAudioStudioMedia = {
  id: string;
  title: string;
  projectId: string;
  source: string;
  relPath: string;
  mimeType: string;
  createdAt: string;
};

export const metadata: Metadata = {
  title: `Video library | ${BRAND_SUITE}`,
  description: `Browse and download ${BRAND_SHORTS}: racing and football content with SEO-friendly names. ${BRAND_TAGLINE}`,
  openGraph: {
    title: `Video library | ${BRAND_SUITE}`,
    description: BRAND_TAGLINE,
  },
};

export default async function LibraryPage() {
  let manifest: ManifestEntry[] = [];
  try {
    const raw = await fs.readFile(assetsManifestPath(), "utf-8");
    manifest = JSON.parse(raw) as ManifestEntry[];
    manifest.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
  } catch {
    manifest = [];
  }

  const videos: { rel: string; mtimeMs: number }[] = [];
  try {
    const dir = outputVideoDir();
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".mp4")) continue;
      const st = await fs.stat(path.join(dir, f));
      videos.push({ rel: path.join("video", f), mtimeMs: st.mtimeMs });
    }
  } catch {
    /* empty */
  }
  const videoRels = videos
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.rel.localeCompare(b.rel))
    .map((item) => item.rel);

  const backdropVideos = await scanBackdropVideoRels();
  const libraryBackgroundImages = await scanLibraryBackgroundImageRels();
  const voiceRecordings = await scanVoiceRecordingRels();
  const libraryMetadataByContentId = await readLibraryMetadataIndex();
  let audioStudioMedia: LibraryAudioStudioMedia[] = [];
  try {
    const audioStore = await readAudioStudioStore();
    const files: LibraryAudioStudioMedia[] = audioStore.files.map((file) => ({
      id: file.id,
      title: file.title || file.originalName || file.name,
      projectId: file.projectId,
      source: file.source,
      relPath: file.relPath,
      mimeType: file.mimeType,
      createdAt: file.createdAt,
    }));
    const generated: LibraryAudioStudioMedia[] = audioStore.generatedAudio.map((audio) => ({
      id: audio.id,
      title: audio.title || `${audio.provider} generated audio`,
      projectId: audio.projectId,
      source: "generated",
      relPath: audio.relPath,
      mimeType: audio.mimeType,
      createdAt: audio.createdAt,
    }));
    audioStudioMedia = [...files, ...generated].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    audioStudioMedia = [];
  }
  let podcastAudios: LibraryPodcastAudio[] = [];
  try {
    const raw = await fs.readFile(path.join(process.cwd(), PODCAST_PROJECTS_FILE), "utf-8");
    const parsed = JSON.parse(raw) as { projects?: Record<string, PodcastProject> };
    const projects = Object.values(parsed.projects ?? {});
    podcastAudios = projects
      .filter((p) => (p.outputAudioRel ?? "").trim().length > 0)
      .map((p) => ({
        projectId: p.id,
        title: (p.title || "Untitled podcast project").trim(),
        outputAudioRel: p.outputAudioRel!.trim(),
        updatedAt: p.updatedAt,
        sourceUrl: p.sourceUrl?.trim() || undefined,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    podcastAudios = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[color:var(--text-primary)]">Asset library</h1>
        <p className="mt-2 text-[color:var(--text-secondary)]">
          Use <strong className="font-semibold text-[color:var(--text-primary)]">Recent builds</strong> for manifest
          Shorts and the video folder scan,{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Background video</strong> for Runway /
          editor clips and, under <strong className="font-semibold text-[color:var(--text-primary)]">Direct videos</strong>, News
          Shorts camera saves (<code className="text-[color:var(--text-muted)]">camera-record.*</code>
          ), and{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Library images</strong> for background
          stills (<code className="text-[color:var(--text-muted)]">output/images/library/</code>), and{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Voice recordings</strong> for saved News
          Shorts mic takes and Audio Studio recordings, and{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Podcasts</strong> for generated Podcast
          Template audio. Assets live under the
          project <code className="text-[color:var(--text-muted)]">output/</code> folder.{" "}
          <strong className="font-semibold text-[color:var(--text-primary)]">Delete</strong> removes matching files and
          manifest entries where applicable.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-[color:var(--text-muted)]">Loading library…</p>}>
        <LibraryClient
          manifest={manifest}
          videos={videoRels}
          backdropVideos={backdropVideos}
          libraryBackgroundImages={libraryBackgroundImages}
          voiceRecordings={voiceRecordings}
          audioStudioMedia={audioStudioMedia}
          podcastAudios={podcastAudios}
          libraryMetadataByContentId={libraryMetadataByContentId}
        />
      </Suspense>
    </div>
  );
}
