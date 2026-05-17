"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { DeleteBuildButton } from "@/app/components/DeleteBuildButton";
import { CleanOrphansButton } from "@/app/components/CleanOrphansButton";
import { LANGUAGE_LABELS, type LanguageCode } from "@/app/lib/language-studio/types";
import {
  contentIdFromAnyBackgroundImageRel,
  contentIdFromUploadsBackdropVideoRel,
  contentIdFromVideoFilename,
  contentIdFromVoiceRecordingRel,
  type ManifestEntry,
} from "@/app/lib/asset-manifest";
import { withAppPathPrefix } from "@/app/lib/app-base-path";

const BRAND_RULES: Array<{ id: string; label: string; patterns: RegExp[] }> = [
  { id: "football365", label: "Football365", patterns: [/football365/i] },
  { id: "racing365", label: "Racing365", patterns: [/racing365/i] },
  { id: "planetsport", label: "Planet Sport", patterns: [/planet[\s-]?sport/i, /planetsport/i] },
  { id: "teamtalk", label: "TEAMtalk", patterns: [/teamtalk/i] },
  { id: "livescore", label: "LiveScore", patterns: [/livescore/i] },
];

function fileUrl(rel: string) {
  return withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}`);
}

function downloadUrl(rel: string) {
  return withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}&download=1`);
}

function newsShortsBackdropVideoHref(rel: string) {
  return `${withAppPathPrefix("/news-shorts")}?backdropVideo=${encodeURIComponent(rel)}`;
}

function newsShortsBackdropImageHref(rel: string) {
  return `${withAppPathPrefix("/news-shorts")}?backdropImage=${encodeURIComponent(rel)}`;
}

function isDirectVideoRecordingRel(rel: string): boolean {
  const base = rel.split("/").pop() ?? "";
  return /^camera-record\.(webm|mp4)$/i.test(base);
}

function libraryDisplayTitle(m: ManifestEntry): string {
  const t = m.seoTitle?.trim();
  if (t) return t;
  return m.id.replace(/-/g, " ");
}

type Props = {
  manifest: ManifestEntry[];
  videos: string[];
  /** Rel paths like `uploads/{contentId}/custom-bg.mp4` (Runway / editor backdrop). */
  backdropVideos: string[];
  /** Background stills: `images/library/{contentId}/custom-bg…` */
  libraryBackgroundImages: string[];
  /** Saved mic takes: `audio/{contentId}-voice-record.webm` */
  voiceRecordings: string[];
  audioStudioMedia: Array<{
    id: string;
    title: string;
    projectId: string;
    source: string;
    relPath: string;
    mimeType: string;
    createdAt: string;
  }>;
  podcastAudios: Array<{
    projectId: string;
    title: string;
    outputAudioRel: string;
    updatedAt: string;
    sourceUrl?: string;
  }>;
  libraryMetadataByContentId: Record<string, { title?: string; sourceUrl?: string; keywords?: string[] }>;
};

type LibraryTab = "builds" | "backgroundVideo" | "libraryImages" | "voiceRecordings" | "podcasts";

type LibraryBrandOption = { id: string; label: string };
type LibraryLanguageOption = { id: "all" | LanguageCode; label: string };

function toSearchPool(values: Array<string | null | undefined>): string {
  return values
    .map((v) => (v ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function inferSiteBrandTags(values: Array<string | null | undefined>): string[] {
  const joined = values.filter(Boolean).join(" ");
  const out = new Set<string>();
  for (const rule of BRAND_RULES) {
    if (rule.patterns.some((rx) => rx.test(joined))) out.add(rule.id);
  }
  for (const raw of values) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
      if (!host) continue;
      if (host.includes("football365")) out.add("football365");
      else if (host.includes("racing365")) out.add("racing365");
      else if (host.includes("planetsport")) out.add("planetsport");
      else if (host.includes("teamtalk")) out.add("teamtalk");
      else if (host.includes("livescore")) out.add("livescore");
      else out.add(`site:${host}`);
    } catch {
      // Not a URL string; ignore.
    }
  }
  return [...out];
}

function inferLanguageTags(values: Array<string | null | undefined>): LanguageCode[] {
  const joined = values.filter(Boolean).join(" ");
  const out = new Set<LanguageCode>();
  const fromKeyword = /(?:^|\s|,)language:([a-z]{2}|zh)(?:\s|,|$)/gi;
  let match = fromKeyword.exec(joined);
  while (match) {
    const code = match[1] as LanguageCode;
    if (code in LANGUAGE_LABELS) out.add(code);
    match = fromKeyword.exec(joined);
  }
  const fromLanguageFolder = /images\/library\/language-[^/]+-([a-z]{2}|zh)\//gi;
  match = fromLanguageFolder.exec(joined);
  while (match) {
    const code = match[1] as LanguageCode;
    if (code in LANGUAGE_LABELS) out.add(code);
    match = fromLanguageFolder.exec(joined);
  }
  for (const [code, label] of Object.entries(LANGUAGE_LABELS) as Array<[LanguageCode, string]>) {
    if (new RegExp(`\\b${label.replace(/\s+/g, "\\s+")}\\b`, "i").test(joined)) out.add(code);
  }
  return [...out];
}

function brandLabel(tag: string): string {
  const hit = BRAND_RULES.find((b) => b.id === tag);
  if (hit) return hit.label;
  if (tag.startsWith("site:")) return tag.slice(5);
  return tag;
}

export function LibraryClient({
  manifest,
  videos,
  backdropVideos,
  libraryBackgroundImages,
  voiceRecordings,
  audioStudioMedia,
  podcastAudios,
  libraryMetadataByContentId,
}: Props) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<LibraryTab>("builds");
  const [query, setQuery] = useState("");
  const [siteBrandFilter, setSiteBrandFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState<"all" | LanguageCode>("all");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (
      t === "builds" ||
      t === "backgroundVideo" ||
      t === "libraryImages" ||
      t === "voiceRecordings" ||
      t === "podcasts"
    ) {
      setTab(t);
    }
  }, [searchParams]);
  const needle = query.trim().toLowerCase();

  const brandOptions = (() => {
    const tags = new Set<string>();
    for (const m of manifest) {
      const meta = libraryMetadataByContentId[m.id];
      inferSiteBrandTags([m.id, m.seoTitle, ...(m.keywords ?? []), meta?.title, meta?.sourceUrl, ...(meta?.keywords ?? [])]).forEach((t) =>
        tags.add(t),
      );
    }
    for (const rel of videos) {
      const cid = contentIdFromVideoFilename(rel) ?? "";
      const entry = cid ? manifest.find((m) => m.id === cid) : undefined;
      const meta = cid ? libraryMetadataByContentId[cid] : undefined;
      inferSiteBrandTags([rel, cid, entry?.seoTitle, ...(entry?.keywords ?? []), meta?.title, meta?.sourceUrl, ...(meta?.keywords ?? [])]).forEach((t) =>
        tags.add(t),
      );
    }
    for (const rel of backdropVideos) {
      const cid = contentIdFromUploadsBackdropVideoRel(rel) ?? "";
      const entry = cid ? manifest.find((m) => m.id === cid) : undefined;
      const meta = cid ? libraryMetadataByContentId[cid] : undefined;
      inferSiteBrandTags([rel, cid, entry?.seoTitle, ...(entry?.keywords ?? []), meta?.title, meta?.sourceUrl, ...(meta?.keywords ?? [])]).forEach((t) =>
        tags.add(t),
      );
    }
    for (const rel of libraryBackgroundImages) {
      const cid = contentIdFromAnyBackgroundImageRel(rel) ?? "";
      const entry = cid ? manifest.find((m) => m.id === cid) : undefined;
      const meta = cid ? libraryMetadataByContentId[cid] : undefined;
      inferSiteBrandTags([rel, cid, entry?.seoTitle, ...(entry?.keywords ?? []), meta?.title, meta?.sourceUrl, ...(meta?.keywords ?? [])]).forEach((t) =>
        tags.add(t),
      );
    }
    for (const rel of voiceRecordings) {
      const cid = contentIdFromVoiceRecordingRel(rel) ?? "";
      const entry = cid ? manifest.find((m) => m.id === cid) : undefined;
      const meta = cid ? libraryMetadataByContentId[cid] : undefined;
      inferSiteBrandTags([rel, cid, entry?.seoTitle, ...(entry?.keywords ?? []), meta?.title, meta?.sourceUrl, ...(meta?.keywords ?? [])]).forEach((t) =>
        tags.add(t),
      );
    }
    for (const audio of audioStudioMedia) {
      inferSiteBrandTags([audio.projectId, audio.title, audio.source, audio.relPath, "audio studio"]).forEach((t) => tags.add(t));
    }
    for (const pod of podcastAudios) {
      inferSiteBrandTags([pod.projectId, pod.title, pod.outputAudioRel, pod.sourceUrl]).forEach((t) => tags.add(t));
    }
    const options: LibraryBrandOption[] = [...tags]
      .sort((a, b) => brandLabel(a).localeCompare(brandLabel(b)))
      .map((tag) => ({ id: tag, label: brandLabel(tag) }));
    return [{ id: "all", label: "All sites / brands" }, ...options];
  })();

  const hasBrand = (values: Array<string | null | undefined>) => {
    if (siteBrandFilter === "all") return true;
    return inferSiteBrandTags(values).includes(siteBrandFilter);
  };
  const languageOptions: LibraryLanguageOption[] = [
    { id: "all", label: "All languages" },
    ...(Object.entries(LANGUAGE_LABELS) as Array<[LanguageCode, string]>).map(([id, label]) => ({ id, label })),
  ];
  const hasLanguage = (values: Array<string | null | undefined>) => {
    if (languageFilter === "all") return true;
    return inferLanguageTags(values).includes(languageFilter);
  };

  const manifestFiltered = manifest.filter((m) => {
    const meta = libraryMetadataByContentId[m.id];
    const values = [m.id, m.seoTitle, ...(m.keywords ?? []), ...(meta?.keywords ?? []), meta?.title, meta?.sourceUrl];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });
  const videosFiltered = videos.filter((v) => {
    const cid = contentIdFromVideoFilename(v);
    const entry = cid ? manifest.find((m) => m.id === cid) : undefined;
    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
    const values = [v, cid ?? "", entry?.seoTitle, ...(entry?.keywords ?? []), ...(meta?.keywords ?? []), meta?.title, meta?.sourceUrl];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });
  const backdropsFiltered = backdropVideos.filter((rel) => {
    const cid = contentIdFromUploadsBackdropVideoRel(rel) ?? "";
    const entry = manifest.find((m) => m.id === cid);
    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
    const values = [
      rel,
      cid,
      isDirectVideoRecordingRel(rel) ? "direct videos camera recording news shorts" : "",
      entry?.seoTitle,
      ...(entry?.keywords ?? []),
      ...(meta?.keywords ?? []),
      meta?.title,
      meta?.sourceUrl,
    ];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });
  const directVideosFiltered = backdropsFiltered.filter((rel) => isDirectVideoRecordingRel(rel));
  const importedBackdropVideosFiltered = backdropsFiltered.filter((rel) => !isDirectVideoRecordingRel(rel));
  const imagesFiltered = libraryBackgroundImages.filter((rel) => {
    const cid = contentIdFromAnyBackgroundImageRel(rel) ?? "";
    const entry = manifest.find((m) => m.id === cid);
    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
    const values = [rel, cid, entry?.seoTitle, ...(entry?.keywords ?? []), ...(meta?.keywords ?? []), meta?.title, meta?.sourceUrl];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });
  const voiceRecordingsFiltered = voiceRecordings.filter((rel) => {
    const cid = contentIdFromVoiceRecordingRel(rel) ?? "";
    const entry = manifest.find((m) => m.id === cid);
    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
    const values = [
      rel,
      cid,
      "voice recording",
      "voice",
      "audio",
      "news shorts",
      entry?.seoTitle,
      ...(entry?.keywords ?? []),
      ...(meta?.keywords ?? []),
      meta?.title,
      meta?.sourceUrl,
    ];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });
  const audioStudioMediaFiltered = audioStudioMedia.filter((audio) => {
    const values = [
      audio.id,
      audio.projectId,
      audio.title,
      audio.source,
      audio.relPath,
      audio.mimeType,
      "audio studio",
      "voice notes",
      "voice recording",
      "audio",
    ];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });
  const podcastAudiosFiltered = podcastAudios.filter((pod) => {
    const values = [
      pod.projectId,
      pod.title,
      pod.outputAudioRel,
      pod.sourceUrl,
      "podcast",
      "podcast template",
      "audio",
    ];
    if (!hasBrand(values)) return false;
    if (!hasLanguage(values)) return false;
    if (!needle) return true;
    return toSearchPool(values).includes(needle);
  });

  return (
    <section
      className="flex flex-col overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="library-tablist flex flex-wrap gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
        role="tablist"
        aria-label="Asset library sections"
      >
        <button
          type="button"
          role="tab"
          id="tab-builds"
          aria-selected={tab === "builds"}
          aria-controls="panel-builds"
          tabIndex={tab === "builds" ? 0 : -1}
          onClick={() => setTab("builds")}
          className="library-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Recent builds
          <span className="ml-2 tabular-nums text-xs font-normal opacity-80">({manifestFiltered.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-background-video"
          aria-selected={tab === "backgroundVideo"}
          aria-controls="panel-background-video"
          tabIndex={tab === "backgroundVideo" ? 0 : -1}
          onClick={() => setTab("backgroundVideo")}
          className="library-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Background video
          <span className="ml-2 tabular-nums text-xs font-normal opacity-80">({backdropsFiltered.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-library-images"
          aria-selected={tab === "libraryImages"}
          aria-controls="panel-library-images"
          tabIndex={tab === "libraryImages" ? 0 : -1}
          onClick={() => setTab("libraryImages")}
          className="library-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Library images
          <span className="ml-2 tabular-nums text-xs font-normal opacity-80">({imagesFiltered.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-voice-recordings"
          aria-selected={tab === "voiceRecordings"}
          aria-controls="panel-voice-recordings"
          tabIndex={tab === "voiceRecordings" ? 0 : -1}
          onClick={() => setTab("voiceRecordings")}
          className="library-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Voice recordings
          <span className="ml-2 tabular-nums text-xs font-normal opacity-80">({voiceRecordingsFiltered.length + audioStudioMediaFiltered.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-podcasts"
          aria-selected={tab === "podcasts"}
          aria-controls="panel-podcasts"
          tabIndex={tab === "podcasts" ? 0 : -1}
          onClick={() => setTab("podcasts")}
          className="library-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Podcasts
          <span className="ml-2 tabular-nums text-xs font-normal opacity-80">({podcastAudiosFiltered.length})</span>
        </button>
        <label className="ml-auto min-w-[15rem] flex-1 text-xs text-[color:var(--text-muted)]">
          Site / Brand
          <select
            value={siteBrandFilter}
            onChange={(e) => setSiteBrandFilter(e.target.value)}
            className="mt-1 w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            {brandOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[12rem] flex-1 text-xs text-[color:var(--text-muted)]">
          Language
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value as "all" | LanguageCode)}
            className="mt-1 w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            {languageOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[15rem] flex-1 text-xs text-[color:var(--text-muted)]">
          Search library
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, content ID, keyword…"
            className="mt-1 w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
        </label>
      </div>

      <div className="space-y-6 p-4">
        {tab === "builds" && (
          <div id="panel-builds" role="tabpanel" aria-labelledby="tab-builds" className="space-y-6">
            <Panel title="Recent builds (manifest)">
              {manifestFiltered.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No renders yet — build a Short from the editor.</p>
              ) : (
                <ul className="space-y-6">
                  {manifestFiltered.map((m) => (
                    <li key={`${m.id}-${m.createdAt}`} className="library-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-semibold leading-snug text-[color:var(--text-primary)]">
                            {libraryDisplayTitle(m)}
                          </h2>
                          <p className="mt-1 font-mono text-xs text-[#eab308]">{m.id}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {m.format} · {new Date(m.createdAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                          </p>
                        </div>
                      </div>
                      {(m.keywords?.length ?? 0) > 0 && (
                        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                          Keywords: {m.keywords!.join(", ")}
                        </p>
                      )}
                      {m.editedVideo && (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[#eab308]">
                          Preview: edited cut
                        </p>
                      )}
                      <video
                        src={fileUrl(m.editedVideo ?? m.video)}
                        controls
                        playsInline
                        title={libraryDisplayTitle(m)}
                        className={`library-media-chrome ${m.editedVideo ? "mt-2" : "mt-3"} mx-auto aspect-[9/16] w-full max-w-xs max-h-[min(85vh,960px)] object-contain`}
                      />
                      {m.editedVideo && (
                        <p className="mt-2 text-center text-[11px] text-[color:var(--text-muted)]">
                          <a
                            className="text-[color:var(--accent)] hover:underline"
                            href={fileUrl(m.video)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open original build in new tab
                          </a>
                        </p>
                      )}
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        {m.editedVideo ? (
                          <>
                            <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(m.editedVideo)}>
                              Download edited MP4
                            </a>
                            <span aria-hidden="true">·</span>
                            <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(m.video)}>
                              Download original MP4
                            </a>
                          </>
                        ) : (
                          <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(m.video)}>
                            Download MP4
                          </a>
                        )}
                        <span aria-hidden="true">·</span>
                        <a className="text-[color:var(--accent)] hover:underline" href={fileUrl(m.subtitles)}>
                          Preview SRT
                        </a>
                        <span aria-hidden="true">·</span>
                        <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(m.subtitles)}>
                          Download SRT
                        </a>
                      </p>
                      <DeleteBuildButton contentId={m.id} createdAt={m.createdAt} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Video folder scan">
              <div className="library-card mb-3 p-3">
                <p className="mb-2 text-xs text-[color:var(--text-secondary)]">
                  Remove stale videos that no longer exist in the manifest.
                </p>
                <CleanOrphansButton />
              </div>
              {videosFiltered.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No MP4 files detected.</p>
              ) : (
                <ul className="space-y-4 text-sm text-[color:var(--text-secondary)]">
                  {videosFiltered.map((v) => {
                    const cid = contentIdFromVideoFilename(v);
                    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
                    return (
                      <li key={v} className="library-card p-3">
                        <a href={fileUrl(v)} className="text-[color:var(--accent)] hover:underline">
                          {v}
                        </a>
                        {meta?.keywords?.length ? (
                          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                            Keywords: {meta.keywords.join(", ")}
                          </p>
                        ) : null}
                        {cid ? (
                          <DeleteBuildButton contentId={cid} label="Delete this file & matching assets" />
                        ) : (
                          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                            Name doesn’t end with <code className="text-[color:var(--text-secondary)]">-short.mp4</code>{" "}
                            — delete via
                            the Recent builds tab or remove the file manually.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {tab === "backgroundVideo" && (
          <div id="panel-background-video" role="tabpanel" aria-labelledby="tab-background-video" className="space-y-8">
            <p className="text-xs text-[color:var(--text-secondary)]">
              To use a clip as the motion backdrop in News Shorts, choose{" "}
              <strong className="font-semibold text-[color:var(--text-primary)]">Use in News Shorts</strong> on a row — it
              opens the builder with that file selected.
            </p>
            {backdropsFiltered.length === 0 ? (
              <Panel title="Background video">
                <p className="text-sm text-[color:var(--text-muted)]">
                  No backdrop clips yet — generate one in the editor (Runway), save a{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">Video record</strong> in News Shorts
                  (<code className="text-[color:var(--text-secondary)]">camera-record.webm</code>, listed under{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">Direct videos</strong> below when
                  present), or place <code className="text-[color:var(--text-secondary)]">custom-bg.mp4</code> under{" "}
                  <code className="text-[color:var(--text-secondary)]">output/uploads/&lt;content-id&gt;/</code>.
                </p>
              </Panel>
            ) : null}

            {backdropsFiltered.length > 0 ? (
              <>
                <Panel title={`Direct videos (${directVideosFiltered.length})`}>
                  <p className="mb-3 text-xs text-[color:var(--text-secondary)]">
                    Clips saved from <strong className="font-semibold text-[color:var(--text-primary)]">News Shorts → Video Record</strong>{" "}
                    (<code className="text-[color:var(--text-secondary)]">camera-record.webm</code> /{" "}
                    <code className="text-[color:var(--text-secondary)]">camera-record.mp4</code>).
                  </p>
                  {directVideosFiltered.length === 0 ? (
                    <p className="text-sm text-[color:var(--text-muted)]">No saved camera recordings yet.</p>
                  ) : (
                    <ul className="space-y-6">
                      {directVideosFiltered.map((rel) => {
                        const cid = contentIdFromUploadsBackdropVideoRel(rel);
                        const meta = cid ? libraryMetadataByContentId[cid] : undefined;
                        return (
                          <li key={rel} className="library-card p-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="font-mono text-xs text-[#eab308]">{cid ?? rel}</p>
                              <p className="text-xs text-[color:var(--text-muted)]">{rel}</p>
                            </div>
                            {meta?.keywords?.length ? (
                              <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                                Keywords: {meta.keywords.join(", ")}
                              </p>
                            ) : null}
                            <video
                              src={fileUrl(rel)}
                              controls
                              playsInline
                              title={cid ? `Direct video ${cid}` : rel}
                              className="library-media-chrome mt-3 mx-auto max-h-[min(85vh,960px)] w-full max-w-lg object-contain"
                            />
                            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                              <a
                                className="font-semibold text-[#86efac] hover:underline"
                                href={newsShortsBackdropVideoHref(rel)}
                              >
                                Use in News Shorts
                              </a>
                              <span aria-hidden="true">·</span>
                              <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(rel)}>
                                {rel.toLowerCase().endsWith(".webm") ? "Download WebM" : "Download MP4"}
                              </a>
                              <span aria-hidden="true">·</span>
                              <a
                                className="text-[color:var(--accent)] hover:underline"
                                href={fileUrl(rel)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open in new tab
                              </a>
                            </p>
                            {cid ? (
                              <DeleteBuildButton contentId={cid} label="Delete video & assets" />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>

                <Panel title={`Background clips — Runway / upload (${importedBackdropVideosFiltered.length})`}>
                  <p className="mb-3 text-xs text-[color:var(--text-secondary)]">
                    Editor and Runway imports as <code className="text-[color:var(--text-secondary)]">custom-bg.mp4</code>.
                  </p>
                  {importedBackdropVideosFiltered.length === 0 ? (
                    <p className="text-sm text-[color:var(--text-muted)]">No Runway or uploaded backdrop MP4s yet.</p>
                  ) : (
                    <ul className="space-y-6">
                      {importedBackdropVideosFiltered.map((rel) => {
                        const cid = contentIdFromUploadsBackdropVideoRel(rel);
                        const meta = cid ? libraryMetadataByContentId[cid] : undefined;
                        return (
                          <li key={rel} className="library-card p-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="font-mono text-xs text-[#eab308]">{cid ?? rel}</p>
                              <p className="text-xs text-[color:var(--text-muted)]">{rel}</p>
                            </div>
                            {meta?.keywords?.length ? (
                              <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                                Keywords: {meta.keywords.join(", ")}
                              </p>
                            ) : null}
                            <video
                              src={fileUrl(rel)}
                              controls
                              playsInline
                              title={cid ? `Backdrop ${cid}` : rel}
                              className="library-media-chrome mt-3 mx-auto aspect-[9/16] w-full max-w-xs max-h-[min(85vh,960px)] object-contain"
                            />
                            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                              <a
                                className="font-semibold text-[#86efac] hover:underline"
                                href={newsShortsBackdropVideoHref(rel)}
                              >
                                Use in News Shorts
                              </a>
                              <span aria-hidden="true">·</span>
                              <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(rel)}>
                                {rel.toLowerCase().endsWith(".webm") ? "Download WebM" : "Download MP4"}
                              </a>
                              <span aria-hidden="true">·</span>
                              <a
                                className="text-[color:var(--accent)] hover:underline"
                                href={fileUrl(rel)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open in new tab
                              </a>
                            </p>
                            {cid ? (
                              <DeleteBuildButton contentId={cid} label="Delete video & assets" />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </>
            ) : null}
          </div>
        )}

        {tab === "libraryImages" && (
          <div id="panel-library-images" role="tabpanel" aria-labelledby="tab-library-images">
            <Panel title="Library images (background stills)">
              <p className="mb-3 text-xs text-[color:var(--text-secondary)]">
                <strong className="font-semibold text-[color:var(--text-primary)]">Use in News Shorts</strong> on a row
                opens the builder with that still as the background image.
              </p>
              {imagesFiltered.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  No background images yet — upload a still in the editor under{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">Background (before render)</strong>{" "}
                  or <strong className="font-semibold text-[color:var(--text-primary)]">Background video</strong> →{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">Image</strong>. Files are stored
                  under{" "}
                  <code className="text-[color:var(--text-secondary)]">output/images/library/&lt;content-id&gt;/</code>.
                </p>
              ) : (
                <ul className="space-y-6">
                  {imagesFiltered.map((rel) => {
                    const cid = contentIdFromAnyBackgroundImageRel(rel);
                    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
                    const base = rel.split("/").pop() ?? rel;
                    return (
                      <li key={rel} className="library-card p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-mono text-xs text-[#eab308]">{cid ?? rel}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{rel}</p>
                        </div>
                        {meta?.keywords?.length ? (
                          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                            Keywords: {meta.keywords.join(", ")}
                          </p>
                        ) : null}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fileUrl(rel)}
                          alt={cid ? `Background ${cid}` : base}
                          className="library-media-chrome mt-3 mx-auto max-h-[min(85vh,960px)] w-full max-w-xs object-contain"
                        />
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                          <a
                            className="font-semibold text-[#86efac] hover:underline"
                            href={newsShortsBackdropImageHref(rel)}
                          >
                            Use in News Shorts
                          </a>
                          <span aria-hidden="true">·</span>
                          <a className="text-[color:var(--accent)] hover:underline" href={fileUrl(rel)} download={base}>
                            Download image
                          </a>
                          <span aria-hidden="true">·</span>
                          <a
                            className="text-[color:var(--accent)] hover:underline"
                            href={fileUrl(rel)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open in new tab
                          </a>
                        </p>
                        {cid ? (
                          <DeleteBuildButton contentId={cid} label="Delete image & matching assets" />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {tab === "voiceRecordings" && (
          <div id="panel-voice-recordings" role="tabpanel" aria-labelledby="tab-voice-recordings">
            <Panel title="Voice recordings and Audio Studio">
              {voiceRecordingsFiltered.length === 0 && audioStudioMediaFiltered.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  No saved voice takes yet. Record in <strong className="font-semibold text-[color:var(--text-primary)]">Audio Studio</strong> or{" "}
                  <strong className="font-semibold text-[color:var(--text-primary)]">News Shorts → Voice Record</strong>, then save the recording.
                </p>
              ) : (
                <ul className="space-y-6">
                  {audioStudioMediaFiltered.map((audio) => (
                    <li key={audio.id} className="library-card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-lg font-semibold leading-snug text-[color:var(--text-primary)]">{audio.title}</h2>
                        <p className="font-mono text-xs text-[#eab308]">{audio.projectId}</p>
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">{audio.relPath}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        Audio Studio · {audio.source} · {audio.mimeType || "audio"} ·{" "}
                        {new Date(audio.createdAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                      </p>
                      <audio
                        src={fileUrl(audio.relPath)}
                        controls
                        className="library-media-chrome mt-3 w-full max-w-md"
                        title={audio.title}
                      />
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(audio.relPath)}>
                          Download audio
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                          className="text-[color:var(--accent)] hover:underline"
                          href={fileUrl(audio.relPath)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in new tab
                        </a>
                      </p>
                    </li>
                  ))}
                  {voiceRecordingsFiltered.map((rel) => {
                    const cid = contentIdFromVoiceRecordingRel(rel);
                    const meta = cid ? libraryMetadataByContentId[cid] : undefined;
                    const entry = cid ? manifest.find((m) => m.id === cid) : undefined;
                    const base = rel.split("/").pop() ?? rel;
                    const title =
                      meta?.title?.trim() || entry?.seoTitle?.trim() || (cid ? `Voice · ${cid}` : base);
                    return (
                      <li key={rel} className="library-card p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h2 className="text-lg font-semibold leading-snug text-[color:var(--text-primary)]">{title}</h2>
                          <p className="font-mono text-xs text-[#eab308]">{cid ?? rel}</p>
                        </div>
                        <p className="mt-1 text-xs text-[color:var(--text-muted)]">{rel}</p>
                        {(meta?.keywords?.length ?? 0) > 0 && (
                          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                            Keywords: {meta!.keywords!.join(", ")}
                          </p>
                        )}
                        <audio
                          src={fileUrl(rel)}
                          controls
                          className="library-media-chrome mt-3 w-full max-w-md"
                          title={title}
                        />
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                          <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(rel)}>
                            Download audio
                          </a>
                          <span aria-hidden="true">·</span>
                          <a
                            className="text-[color:var(--accent)] hover:underline"
                            href={fileUrl(rel)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open in new tab
                          </a>
                        </p>
                        {cid ? (
                          <DeleteBuildButton contentId={cid} label="Delete voice & matching assets" />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {tab === "podcasts" && (
          <div id="panel-podcasts" role="tabpanel" aria-labelledby="tab-podcasts">
            <Panel title="Podcasts (Podcast Template)">
              {podcastAudiosFiltered.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  No generated podcast audio yet — create and generate from <strong className="font-semibold text-[color:var(--text-primary)]">Podcast Template</strong>.
                </p>
              ) : (
                <ul className="space-y-6">
                  {podcastAudiosFiltered.map((pod) => (
                    <li key={`${pod.projectId}-${pod.outputAudioRel}`} className="library-card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-lg font-semibold leading-snug text-[color:var(--text-primary)]">{pod.title}</h2>
                        <p className="font-mono text-xs text-[#eab308]">{pod.projectId}</p>
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">{pod.outputAudioRel}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        Updated {new Date(pod.updatedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                      </p>
                      {pod.sourceUrl ? (
                        <p className="mt-1 text-xs break-all text-[color:var(--text-muted)]">{pod.sourceUrl}</p>
                      ) : null}
                      <audio
                        src={fileUrl(pod.outputAudioRel)}
                        controls
                        className="library-media-chrome mt-3 w-full max-w-md"
                        title={pod.title}
                      />
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <a className="text-[color:var(--accent)] hover:underline" href={downloadUrl(pod.outputAudioRel)}>
                          Download audio
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                          className="text-[color:var(--accent)] hover:underline"
                          href={fileUrl(pod.outputAudioRel)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in new tab
                        </a>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </div>
    </section>
  );
}
