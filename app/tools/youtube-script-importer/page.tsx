"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { LANGUAGE_CONTENT_STYLES, LANGUAGE_SPORT_CONTEXTS, type LanguageContentStyle, type LanguageJournalistProfile, type LanguageSportContext } from "@/app/lib/language-studio/types";
import type {
  ScriptOutputType,
  TranscriptResult,
  YouTubeGeneratedOutput,
  YouTubeVideoMeta,
} from "@/app/lib/youtube-script/types";

const outputOptions: Array<{ type: ScriptOutputType; label: string; description: string }> = [
  { type: "clean_transcript", label: "Clean transcript", description: "Readable transcript with filler and formatting cleaned up." },
  { type: "summary", label: "Article summary", description: "Headline, standfirst and concise article-style summary." },
  { type: "article", label: "Full article with quotes", description: "Publishable article using the video title, channel and transcript quotes." },
  { type: "video_script", label: "Video script", description: "Presenter-ready video script grounded in the transcript." },
  { type: "podcast_script", label: "Podcast dialogue script", description: "HOST / CO-HOST / GUEST / NARRATOR format only." },
  { type: "shorts_script", label: "YouTube Shorts script", description: "Hook, beats, visuals, caption, title and hashtags." },
  { type: "social_captions", label: "Social captions", description: "Platform-ready captions for social publishing." },
  { type: "quote_clips", label: "Quote clips", description: "Useful quotes with timestamps and suggested captions." },
  { type: "subtitles", label: "Subtitle file", description: "SRT-style subtitle output." },
  { type: "translation", label: "Translate via Language Studio", description: "Language-ready output for multilingual workflows." },
];

const languageOptions = ["British English", "Spanish", "Portuguese", "French", "German", "Italian", "Dutch", "Arabic", "Polish", "Turkish", "Romanian", "Greek", "Czech"];
const sportContextOptions: LanguageSportContext[] = LANGUAGE_SPORT_CONTEXTS;

function formatDuration(seconds?: number): string {
  if (!seconds) return "Unknown duration";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function formatTranscriptTime(seconds?: number): string {
  if (typeof seconds !== "number") return "--:--";
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

function makeManualTranscript(text: string): TranscriptResult {
  const fullText = text.trim();
  const segments = fullText
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => ({ text: chunk }));
  return {
    source: "manual_paste",
    segments: segments.length > 0 ? segments : fullText ? [{ text: fullText }] : [],
    fullText,
    hasTimestamps: false,
  };
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && res.status !== 202) throw new Error(data.error || "Request failed");
  return data;
}

function formatTranscriptAttemptDetails(details?: Record<string, unknown>): string {
  if (!details) return "";
  return Object.entries(details)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.length ? value.join(", ") : "none"}`;
      if (value && typeof value === "object") return `${key}: ${JSON.stringify(value)}`;
      return `${key}: ${String(value ?? "none")}`;
    })
    .join(" · ");
}

export default function YouTubeScriptImporterPage() {
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<YouTubeVideoMeta | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<ScriptOutputType>("summary");
  const [brandTone, setBrandTone] = useState("Planet Sport Studio editorial, clear, concise and useful");
  const [outputLanguage, setOutputLanguage] = useState("British English");
  const [contentStyle, setContentStyle] = useState<LanguageContentStyle>("Feature");
  const [sportContext, setSportContext] = useState<LanguageSportContext>("Football");
  const [rewriteStyle, setRewriteStyle] = useState("Original editorial rewrite for Google: fresh structure, sharp intro, natural expert sports tone, no synonym spinning.");
  const [journalistProfiles, setJournalistProfiles] = useState<LanguageJournalistProfile[]>([]);
  const [selectedJournalistProfileId, setSelectedJournalistProfileId] = useState("");
  const [journalistStyle, setJournalistStyle] = useState("");
  const [outputs, setOutputs] = useState<YouTubeGeneratedOutput[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [transcriptNotice, setTranscriptNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedGeneratedOutput = useMemo(
    () => outputs.find((output) => output.id === selectedOutputId) ?? outputs[0],
    [outputs, selectedOutputId],
  );
  const activeJournalistProfiles = useMemo(
    () => journalistProfiles.filter((profile) => profile.active),
    [journalistProfiles],
  );
  const selectedJournalistProfile = useMemo(
    () => activeJournalistProfiles.find((profile) => profile.id === selectedJournalistProfileId),
    [activeJournalistProfiles, selectedJournalistProfileId],
  );

  const transcriptText = transcript?.fullText ?? manualTranscript;
  const canGenerate = Boolean(meta && transcriptText.trim());

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/language/governance")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { journalistProfiles?: LanguageJournalistProfile[] } | null) => {
        if (!cancelled && Array.isArray(data?.journalistProfiles)) setJournalistProfiles(data.journalistProfiles);
      })
      .catch(() => {
        if (!cancelled) setJournalistProfiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyJournalistProfile = (profileId: string) => {
    const profile = activeJournalistProfiles.find((row) => row.id === profileId);
    setSelectedJournalistProfileId(profileId);
    if (!profile) {
      setJournalistStyle("");
      return;
    }
    setJournalistStyle(
      [
        `${profile.name} (${profile.brand}${profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""})`,
        profile.styleNotes,
        profile.articleGuidelines ? `Article guidelines: ${profile.articleGuidelines}` : "",
      ].filter(Boolean).join("\n"),
    );
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const importTranscriptForVideo = async (videoMeta: YouTubeVideoMeta) => {
    const transcriptAttempt = await postJson<{
      transcript: TranscriptResult | null;
      message?: string;
      reason?: string;
      details?: Record<string, unknown>;
    }>("/api/youtube/transcript", {
      videoId: videoMeta.videoId,
      url: videoMeta.url,
    });
    if (transcriptAttempt.transcript) {
      setTranscript(transcriptAttempt.transcript);
      setManualTranscript(transcriptAttempt.transcript.fullText);
      setTranscriptNotice("");
      setMessage(
        transcriptAttempt.transcript.source === "apify"
          ? "Transcript imported via Apify."
          : "Video loaded and transcript imported.",
      );
    } else {
      const detailText = formatTranscriptAttemptDetails(transcriptAttempt.details);
      setTranscriptNotice(
        [
          transcriptAttempt.message || "Captions were not imported automatically. Use a fallback option below.",
          transcriptAttempt.reason ? `Reason: ${transcriptAttempt.reason}` : "",
          detailText,
        ].filter(Boolean).join(" "),
      );
      setMessage(null);
    }
  };

  const loadVideo = () =>
    run(async () => {
      const validation = await postJson<{ videoId: string; url: string }>("/api/youtube/validate", { url });
      const data = await postJson<{ meta: YouTubeVideoMeta }>("/api/youtube/metadata", validation);
      setMeta(data.meta);
      setUrl(data.meta.url);
      setTranscript(null);
      setOutputs([]);
      await importTranscriptForVideo(data.meta);
    });

  const retryAutomaticTranscriptImport = () =>
    run(async () => {
      const videoMeta = meta;
      if (videoMeta) {
        await importTranscriptForVideo(videoMeta);
        return;
      }
      if (!url.trim()) throw new Error("Paste a YouTube URL first.");
      const validation = await postJson<{ videoId: string; url: string }>("/api/youtube/validate", { url });
      const data = await postJson<{ meta: YouTubeVideoMeta }>("/api/youtube/metadata", validation);
      setMeta(data.meta);
      setUrl(data.meta.url);
      await importTranscriptForVideo(data.meta);
    });

  const importManualTranscript = () =>
    run(async () => {
      const data = await postJson<{ transcript: TranscriptResult }>("/api/youtube/transcript", {
        manualTranscript,
        source: "manual_paste",
      });
      setTranscript(data.transcript);
      setManualTranscript(data.transcript.fullText);
      setTranscriptNotice("");
      setMessage("Transcript imported into the editor.");
    });

  const generateOutput = () =>
    run(async () => {
      if (!meta) throw new Error("Load a YouTube video first.");
      const currentTranscript = transcript ?? makeManualTranscript(manualTranscript);
      if (!currentTranscript.fullText.trim()) throw new Error("Add transcript text first.");
      const data = await postJson<{ output: YouTubeGeneratedOutput }>("/api/youtube/generate-output", {
        meta,
        transcript: currentTranscript,
        outputType: selectedOutput,
        brandTone,
        outputLanguage,
        contentStyle,
        sportContext,
        rewriteStyle,
        journalistProfileName: selectedJournalistProfile
          ? `${selectedJournalistProfile.name} (${selectedJournalistProfile.brand})`
          : undefined,
        journalistStyle,
      });
      setTranscript(currentTranscript);
      setManualTranscript(currentTranscript.fullText);
      setOutputs((rows) => [data.output, ...rows]);
      setSelectedOutputId(data.output.id);
      setMessage(`${data.output.title} generated.`);
    });

  const saveToPlanetSportStudio = () =>
    run(async () => {
      if (!meta) throw new Error("Load a YouTube video first.");
      const currentTranscript = transcript ?? makeManualTranscript(manualTranscript);
      if (!currentTranscript.fullText.trim()) throw new Error("Add transcript text first.");
      await postJson<{ import: { id: string }; languageArticle?: { id: string; title: string } }>("/api/youtube/save", {
        meta,
        transcript: currentTranscript,
        outputs,
        createArticle: true,
      });
      setMessage("Saved to Planet Sport Studio and added to Language Studio for Rewrite and Translations.");
    });

  const saveOutputToPlanetSportStudio = () =>
    run(async () => {
      if (!meta) throw new Error("Load a YouTube video first.");
      const currentTranscript = transcript ?? makeManualTranscript(manualTranscript);
      if (!currentTranscript.fullText.trim()) throw new Error("Add transcript text first.");
      const currentOutput = selectedGeneratedOutput;
      if (!currentOutput?.content.trim()) throw new Error("Generate or paste output first.");
      const nextOutputs = outputs.some((output) => output.id === currentOutput.id)
        ? outputs
        : [currentOutput, ...outputs];
      const shouldCreateArticle = true;
      const data = await postJson<{ import: { id: string }; languageArticle?: { id: string; title: string } }>("/api/youtube/save", {
        meta,
        transcript: currentTranscript,
        outputs: nextOutputs,
        createArticle: shouldCreateArticle,
        articleOutputId: currentOutput.id,
      });
      setOutputs(nextOutputs);
      setTranscript(currentTranscript);
      setManualTranscript(currentTranscript.fullText);
      setMessage(
        currentOutput.type === "article"
          ? `Article saved to Planet Sport Studio${data.languageArticle?.title ? `: ${data.languageArticle.title}` : "."}`
          : "Generated output saved to Planet Sport Studio and added to Language Studio for Rewrite and Translations.",
      );
    });

  const updateTranscriptText = (value: string) => {
    setManualTranscript(value);
    setTranscript((current) => current ? { ...current, fullText: value, segments: makeManualTranscript(value).segments } : null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link href="/tools">
          <R365Button variant="ghost">Back to Tools</R365Button>
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-[#2d214a] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.15),transparent_32%),#0b1020] px-6 py-10 shadow-2xl md:px-10 md:py-14">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Tools / Import</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">
            Planet Sport Studio YouTube Transcript Generator
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Paste a YouTube URL, import a permitted transcript, then turn it into scripts, summaries, captions,
            subtitles and Language Studio-ready output.
          </p>
          <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <input
              className="min-h-12 flex-1 rounded-full border border-violet-400/40 bg-black/30 px-5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#22c55e]"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <button
              type="button"
              onClick={() => void loadVideo()}
              disabled={busy || !url.trim()}
              className="min-h-12 rounded-full border border-[#22c55e]/70 bg-[#22c55e] px-7 text-sm font-bold text-black transition hover:bg-[#38e27a] disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? "Trying import..." : "Try YouTube / Apify import"}
            </button>
          </div>
          <p className="mt-5 text-xs text-slate-400">Quick and simple. Review rights before importing or reusing content.</p>
        </div>
      </section>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Only import videos you own, have permission to use, or where your use is legally allowed. Planet Sport Studio uses official
        YouTube metadata where possible and does not scrape restricted captions.
      </div>

      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {transcriptNotice ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{transcriptNotice}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <div className="space-y-5">
          <TranscriptResultPanel
            meta={meta}
            transcript={transcript}
            transcriptText={transcriptText}
            onTranscriptChange={updateTranscriptText}
            disabled={!transcriptText.trim()}
            onImport={importManualTranscript}
            onCopy={() => void navigator.clipboard.writeText(transcriptText)}
            onDownloadTxt={() => downloadText(`${meta?.videoId ?? "youtube-transcript"}.txt`, transcriptText)}
            onDownloadSrt={() => {
              const body = outputs.find((output) => output.type === "subtitles")?.content ?? transcriptText;
              downloadText(`${meta?.videoId ?? "youtube-transcript"}.srt`, body);
            }}
            onSave={saveToPlanetSportStudio}
          />
          <TranscriptFallbackOptions
            youtubeUrl={url}
            onRetryAutomaticImport={retryAutomaticTranscriptImport}
            busy={busy}
            notice={transcriptNotice}
          />
        </div>

        <div className="space-y-5">
          <ScriptOutputSelector
            selectedOutput={selectedOutput}
            brandTone={brandTone}
            outputLanguage={outputLanguage}
            contentStyle={contentStyle}
            sportContext={sportContext}
            rewriteStyle={rewriteStyle}
            journalistProfiles={activeJournalistProfiles}
            selectedJournalistProfileId={selectedJournalistProfileId}
            journalistStyle={journalistStyle}
            busy={busy}
            canGenerate={canGenerate}
            onOutputChange={setSelectedOutput}
            onBrandToneChange={setBrandTone}
            onLanguageChange={setOutputLanguage}
            onContentStyleChange={setContentStyle}
            onSportContextChange={setSportContext}
            onRewriteStyleChange={setRewriteStyle}
            onJournalistProfileChange={applyJournalistProfile}
            onJournalistStyleChange={setJournalistStyle}
            onGenerate={generateOutput}
          />
          <GeneratedOutputPanel
            outputs={outputs}
            selectedOutputId={selectedOutputId}
            selectedOutput={selectedGeneratedOutput}
            onSelect={setSelectedOutputId}
            onSave={saveOutputToPlanetSportStudio}
            onUpdate={(content) => {
              if (!selectedGeneratedOutput) return;
              setOutputs((rows) => rows.map((row) => row.id === selectedGeneratedOutput.id ? { ...row, content } : row));
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TranscriptResultPanel({
  meta,
  transcript,
  transcriptText,
  onTranscriptChange,
  disabled,
  onImport,
  onCopy,
  onDownloadTxt,
  onDownloadSrt,
  onSave,
}: {
  meta: YouTubeVideoMeta | null;
  transcript: TranscriptResult | null;
  transcriptText: string;
  onTranscriptChange: (value: string) => void;
  disabled: boolean;
  onImport: () => void;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadSrt: () => void;
  onSave: () => void;
}) {
  const timedSegments = transcript?.hasTimestamps ? transcript.segments.filter((segment) => segment.text.trim()) : [];

  return (
    <Panel title="Transcript Result" className="overflow-hidden">
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1f2d26] bg-black/30 p-4">
            {meta?.videoId ? (
              <iframe
                className="aspect-video w-full rounded-xl border border-[#1f2d26] bg-black"
                src={youtubeEmbedUrl(meta.videoId)}
                title={meta.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                Load a video to preview it here
              </div>
            )}
            <h2 className="mt-4 text-lg font-bold leading-snug text-white">
              {meta?.title ?? "Paste a YouTube URL above"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{meta?.channelName ?? "Video details will appear after import"}</p>
            <p className="mt-2 text-xs text-slate-500">
              {formatDuration(meta?.durationSeconds)} · {meta?.publishedAt ? new Date(meta.publishedAt).toLocaleDateString() : "Publish date unknown"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f2d26] bg-black/30 p-4">
            <p className="text-sm font-bold text-white">Get the transcript</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-full border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300 hover:border-[#22c55e]/60 hover:text-white" onClick={onCopy} disabled={disabled}>
                Copy
              </button>
              <button type="button" className="rounded-full border border-violet-400/60 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/30" onClick={onDownloadTxt} disabled={disabled}>
                Download TXT
              </button>
              <button type="button" className="rounded-full border border-violet-400/40 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/20" onClick={onDownloadSrt} disabled={disabled}>
                Download SRT
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <R365Button variant="ghost" onClick={onImport} disabled={disabled}>Import edited transcript</R365Button>
              <R365Button onClick={onSave} disabled={disabled}>Save to Planet Sport Studio</R365Button>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#1f2d26] bg-[#090d18] p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{transcript?.hasTimestamps ? "Timestamped transcript" : "Editable transcript"}</span>
            <span>{transcriptText.length.toLocaleString()} chars</span>
          </div>
          {timedSegments.length > 0 ? (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#1f2d26] bg-black/30 p-3 text-xs">
              {timedSegments.slice(0, 80).map((segment, index) => (
                <div key={`${segment.startSeconds ?? index}-${index}`} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                  <span className="font-mono text-slate-500">{formatTranscriptTime(segment.startSeconds)}</span>
                  <span className="leading-5 text-slate-200">{segment.text}</span>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            className="min-h-[420px] w-full rounded-xl border border-[#1f2d26] bg-black/30 p-3 font-mono text-xs leading-5 text-white outline-none placeholder:text-slate-600 focus:border-[#22c55e]/60"
            value={transcriptText}
            onChange={(e) => onTranscriptChange(e.target.value)}
            placeholder="Transcript will appear here. If captions are unavailable, paste a transcript or upload a file below..."
          />
        </div>
      </div>
    </Panel>
  );
}

function TranscriptFallbackOptions({
  youtubeUrl,
  onRetryAutomaticImport,
  busy,
  notice,
}: {
  youtubeUrl: string;
  onRetryAutomaticImport: () => void;
  busy: boolean;
  notice: string;
}) {
  return (
    <Panel title="Import Script">
      <div className="space-y-4 text-sm text-slate-400">
        <p>{notice || "Try the compliant YouTube / Apify import first. Manual paste and upload fallbacks can be added back once this flow is stable."}</p>
        <div className="rounded-lg border border-[#1f2d26] bg-black/20 p-3">
          <p className="font-semibold text-white">Try YouTube / Apify import</p>
          <p className="mt-1 text-xs text-slate-500">
            Calls the Planet Sport Studio transcript route again. It tries owned-channel YouTube Captions first, then the Apify
            YouTube transcript actor when the Apify token is configured.
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-[#22c55e]/50 bg-[#22c55e]/15 px-3 py-2 text-xs font-bold text-[#86efac] hover:bg-[#22c55e]/25 disabled:pointer-events-none disabled:opacity-50"
            onClick={onRetryAutomaticImport}
            disabled={busy || !youtubeUrl.trim()}
          >
            {busy ? "Trying transcript pull..." : "Try YouTube / Apify import"}
          </button>
        </div>
      </div>
    </Panel>
  );
}

function ScriptOutputSelector({
  selectedOutput,
  brandTone,
  outputLanguage,
  contentStyle,
  sportContext,
  rewriteStyle,
  journalistProfiles,
  selectedJournalistProfileId,
  journalistStyle,
  busy,
  canGenerate,
  onOutputChange,
  onBrandToneChange,
  onLanguageChange,
  onContentStyleChange,
  onSportContextChange,
  onRewriteStyleChange,
  onJournalistProfileChange,
  onJournalistStyleChange,
  onGenerate,
}: {
  selectedOutput: ScriptOutputType;
  brandTone: string;
  outputLanguage: string;
  contentStyle: LanguageContentStyle;
  sportContext: LanguageSportContext;
  rewriteStyle: string;
  journalistProfiles: LanguageJournalistProfile[];
  selectedJournalistProfileId: string;
  journalistStyle: string;
  busy: boolean;
  canGenerate: boolean;
  onOutputChange: (value: ScriptOutputType) => void;
  onBrandToneChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onContentStyleChange: (value: LanguageContentStyle) => void;
  onSportContextChange: (value: LanguageSportContext) => void;
  onRewriteStyleChange: (value: string) => void;
  onJournalistProfileChange: (value: string) => void;
  onJournalistStyleChange: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <Panel title="Output Generator">
      <div className="space-y-4">
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Output type
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
            value={selectedOutput}
            onChange={(e) => onOutputChange(e.target.value as ScriptOutputType)}
          >
            {outputOptions.map((option) => (
              <option key={option.type} value={option.type}>{option.label}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">{outputOptions.find((option) => option.type === selectedOutput)?.description}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Content style
            <select
              className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
              value={contentStyle}
              onChange={(e) => onContentStyleChange(e.target.value as LanguageContentStyle)}
            >
              {LANGUAGE_CONTENT_STYLES.map((style) => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Sport
            <select
              className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
              value={sportContext}
              onChange={(e) => onSportContextChange(e.target.value as LanguageSportContext)}
            >
              {sportContextOptions.map((sport) => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Brand tone
          <input
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
            value={brandTone}
            onChange={(e) => onBrandToneChange(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Output language
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
            value={outputLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {languageOptions.map((language) => (
              <option key={language} value={language}>{language}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Style
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 font-mono text-xs leading-5 text-white"
            value={rewriteStyle}
            onChange={(e) => onRewriteStyleChange(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Use Content Creator Profile
          <select
            className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
            value={selectedJournalistProfileId}
            onChange={(e) => onJournalistProfileChange(e.target.value)}
          >
            <option value="">Manual creator style</option>
            {journalistProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} · {profile.brand}{profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Creator Style
          <textarea
            className="mt-1 min-h-28 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 font-mono text-xs leading-5 text-white"
            value={journalistStyle}
            onChange={(e) => onJournalistStyleChange(e.target.value)}
            placeholder="Choose a profile or add manual creator style notes..."
          />
        </label>
        <R365Button onClick={onGenerate} disabled={busy || !canGenerate}>
          {busy ? "Generating..." : "Generate output"}
        </R365Button>
      </div>
    </Panel>
  );
}

function GeneratedOutputPanel({
  outputs,
  selectedOutputId,
  selectedOutput,
  onSelect,
  onSave,
  onUpdate,
}: {
  outputs: YouTubeGeneratedOutput[];
  selectedOutputId: string;
  selectedOutput?: YouTubeGeneratedOutput;
  onSelect: (id: string) => void;
  onSave: () => void;
  onUpdate: (content: string) => void;
}) {
  return (
    <Panel title="Generated Output">
      <div className="space-y-3">
        {outputs.length > 1 ? (
          <select
            className="w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
            value={selectedOutputId || selectedOutput?.id || ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            {outputs.map((output) => (
              <option key={output.id} value={output.id}>{output.title} · {new Date(output.createdAt).toLocaleTimeString()}</option>
            ))}
          </select>
        ) : null}
        <textarea
          className="min-h-[420px] w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3 font-mono text-xs leading-5 text-white placeholder:text-slate-600"
          value={selectedOutput?.content ?? ""}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder="Generated output will appear here and can be edited before saving..."
        />
        <div className="flex flex-wrap gap-2">
          <R365Button
            variant="ghost"
            disabled={!selectedOutput?.content}
            onClick={() => selectedOutput ? void navigator.clipboard.writeText(selectedOutput.content) : undefined}
          >
            Copy output
          </R365Button>
          <R365Button
            variant="ghost"
            disabled={!selectedOutput?.content}
            onClick={() => selectedOutput ? downloadText(`${selectedOutput.type}.txt`, selectedOutput.content) : undefined}
          >
            Download output
          </R365Button>
          <R365Button
            disabled={!selectedOutput?.content}
            onClick={onSave}
          >
            {selectedOutput?.type === "article" ? "Save article to Planet Sport Studio" : "Save output to Planet Sport Studio"}
          </R365Button>
          <Link href="/language-studio">
            <R365Button variant="ghost">Open Language Studio</R365Button>
          </Link>
          <Link href="/article-studio">
            <R365Button variant="ghost">Open Article Studio</R365Button>
          </Link>
        </div>
      </div>
    </Panel>
  );
}
