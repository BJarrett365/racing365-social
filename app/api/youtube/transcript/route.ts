import { NextResponse } from "next/server";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import type { TranscriptResult, TranscriptSegment } from "@/app/lib/youtube-script/types";
import { parseManualTranscript, parseTimedTranscript } from "@/app/lib/youtube-script/utils";

type CaptionListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      language?: string;
      name?: string;
      trackKind?: string;
      isAutoSynced?: boolean;
    };
  }>;
};

type TranscriptFetchResult = {
  transcript: TranscriptResult | null;
  reason: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApifyRunResponse = {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

const APIFY_DEFAULT_ACTOR_ID = "apilabs/youtube-caption-transcription-scraper";
const APIFY_FALLBACK_ACTOR_IDS = ["pintostudio/youtube-transcript-scraper"];

function toApifyActorPath(actorId: string): string {
  return actorId.trim().replace("/", "~");
}

function numberFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function textFromUnknown(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function segmentsFromUnknown(value: unknown): TranscriptSegment[] {
  const values = arrayFromUnknown(value);
  if (values.length === 0) return [];
  const segments: TranscriptSegment[] = [];
  for (const item of values) {
    if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const text =
        textFromUnknown(row.text) ||
        textFromUnknown(row.caption) ||
        textFromUnknown(row.subtitle) ||
        textFromUnknown(row.value);
      if (!text) continue;
      const startSeconds =
        numberFromUnknown(row.startSeconds) ??
        numberFromUnknown(row.start) ??
        numberFromUnknown(row.offset) ??
        numberFromUnknown(row.time);
      const endSeconds =
        numberFromUnknown(row.endSeconds) ??
        numberFromUnknown(row.end) ??
        (typeof startSeconds === "number" ? startSeconds + (numberFromUnknown(row.duration) ?? numberFromUnknown(row.dur) ?? 5) : undefined);
    segments.push({ startSeconds, endSeconds, text });
  }
  return segments;
}

function candidateObjectsFromUnknown(value: unknown, depth = 0): Record<string, unknown>[] {
  if (!value || typeof value !== "object" || depth > 3) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => candidateObjectsFromUnknown(item, depth + 1));
  }
  const row = value as Record<string, unknown>;
  const nestedKeys = ["data", "result", "results", "searchResult", "item", "items", "output", "transcript", "transcripts", "subtitles", "captions"];
  return [
    row,
    ...nestedKeys.flatMap((key) => candidateObjectsFromUnknown(row[key], depth + 1)),
  ];
}

function transcriptFromApifyItems(items: unknown[]): TranscriptResult | null {
  const directSegments = segmentsFromUnknown(items);
  if (directSegments.length > 0) {
    return {
      source: "apify",
      segments: directSegments,
      fullText: directSegments.map((segment) => segment.text).join("\n\n"),
      hasTimestamps: directSegments.some((segment) => typeof segment.startSeconds === "number"),
    };
  }

  const nestedSegments: TranscriptSegment[] = [];
  const fullTextCandidates: Array<{ text: string; language?: string }> = [];

  for (const raw of items) {
    const candidates = candidateObjectsFromUnknown(raw);
    for (const item of candidates) {
      const segmentCandidates = [
        item,
        item.searchResult,
        item.captions_json,
        item.captionsJson,
        item.captions,
        item.captionSegments,
        item.segments,
        item.transcript,
        item.transcriptSegments,
        item.subtitles,
      ];
      const segments = segmentCandidates.flatMap(segmentsFromUnknown);
      const fullText =
        textFromUnknown(item.full_transcript) ||
        textFromUnknown(item.fullTranscript) ||
        textFromUnknown(item.fullText) ||
        textFromUnknown(item.text) ||
        textFromUnknown(item.transcriptText) ||
        textFromUnknown(item.transcript);
      const language =
        textFromUnknown(item.subtitle_language) ||
        textFromUnknown(item.language) ||
        textFromUnknown(item.selectedLanguage) ||
        textFromUnknown(item.subtitleLanguage);

      if (segments.length > 0) {
        nestedSegments.push(...segments);
      }
      if (fullText) {
        fullTextCandidates.push({ text: fullText, language });
      }
    }
  }

  if (nestedSegments.length > 0) {
    return {
      source: "apify",
      language: fullTextCandidates.find((candidate) => candidate.language)?.language,
      segments: nestedSegments,
      fullText: nestedSegments.map((segment) => segment.text).join("\n\n"),
      hasTimestamps: nestedSegments.some((segment) => typeof segment.startSeconds === "number"),
    };
  }

  const longestText = fullTextCandidates
    .filter((candidate) => candidate.text.trim())
    .sort((a, b) => b.text.length - a.text.length)[0];
  if (longestText) {
    return { ...parseManualTranscript(longestText.text), source: "apify", language: longestText.language };
  }

  return null;
}

function logTail(log: string): string {
  return log
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-6)
    .join(" | ")
    .slice(0, 700);
}

async function fetchOwnedChannelTranscript(videoId: string): Promise<TranscriptFetchResult> {
  const oauthToken =
    (await getServerSecretAsync("YOUTUBE_OAUTH_ACCESS_TOKEN")) ??
    (await getServerSecretAsync("YOUTUBE_CAPTIONS_OAUTH_TOKEN"));
  if (!oauthToken) {
    return {
      transcript: null,
      reason: "oauth_missing",
      message:
        "YouTube captions were not imported because owned-channel OAuth is not connected. Paste the transcript or upload permitted audio/video.",
    };
  }

  const listUrl = new URL("https://www.googleapis.com/youtube/v3/captions");
  listUrl.searchParams.set("part", "snippet");
  listUrl.searchParams.set("videoId", videoId);
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });
  if (!listRes.ok) {
    return {
      transcript: null,
      reason: "captions_list_failed",
      message:
        "YouTube captions could not be listed for this video. Check OAuth permissions or use paste/upload fallback.",
    };
  }

  const list = (await listRes.json()) as CaptionListResponse;
  const captions = list.items?.filter((item) => item.id) ?? [];
  const selected =
    captions.find((item) => item.snippet?.language?.toLowerCase().startsWith("en") && item.snippet?.trackKind !== "ASR") ??
    captions.find((item) => item.snippet?.language?.toLowerCase().startsWith("en")) ??
    captions[0];
  if (!selected?.id) {
    return {
      transcript: null,
      reason: "captions_unavailable",
      message:
        "No captions were available through YouTube Captions API. Paste the transcript or upload permitted audio/video.",
    };
  }

  const downloadUrl = new URL(`https://www.googleapis.com/youtube/v3/captions/${selected.id}`);
  downloadUrl.searchParams.set("tfmt", "srt");
  downloadUrl.searchParams.set("alt", "media");
  const downloadRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });
  if (!downloadRes.ok) {
    return {
      transcript: null,
      reason: "captions_download_failed",
      message:
        "YouTube captions were found but could not be downloaded. Paste the transcript or upload permitted audio/video.",
    };
  }

  const captionText = await downloadRes.text();
  return {
    transcript: parseTimedTranscript(captionText, selected.snippet?.language),
    reason: "captions_imported",
    message: "Transcript imported from YouTube Captions API.",
  };
}

async function fetchApifyTranscript(videoUrl: string): Promise<TranscriptFetchResult> {
  const token = await getServerSecretAsync("APIFY_API_TOKEN");
  if (!token) {
    return {
      transcript: null,
      reason: "apify_missing",
      message: "Apify transcript pull skipped because APIFY_API_TOKEN is not configured.",
    };
  }

  const settings = await readStoredSettingsAsync();
  const primaryActorId =
    process.env.APIFY_YOUTUBE_TRANSCRIPT_ACTOR_ID ||
    settings.apifyYoutubeTranscriptActorId?.trim() ||
    APIFY_DEFAULT_ACTOR_ID;
  const language =
    process.env.APIFY_YOUTUBE_TRANSCRIPT_LANGUAGE ||
    settings.apifyYoutubeTranscriptLanguage?.trim() ||
    "en";
  const timeoutSeconds =
    process.env.APIFY_YOUTUBE_TRANSCRIPT_TIMEOUT_SECONDS ||
    settings.apifyYoutubeTranscriptTimeoutSeconds?.trim() ||
    "90";
  const actorIds = Array.from(new Set([primaryActorId, ...APIFY_FALLBACK_ACTOR_IDS].map((id) => id.trim()).filter(Boolean)));
  let lastFailure: TranscriptFetchResult | null = null;

  for (const actorId of actorIds) {
    const result = await runApifyTranscriptActor({ actorId, videoUrl, language, timeoutSeconds, token });
    if (result.transcript) return result;
    lastFailure = result;
  }

  return lastFailure ?? {
    transcript: null,
    reason: "apify_empty",
    message: "Apify did not return a transcript for this video. Paste a transcript result or upload permitted audio/video.",
  };
}

function apifyInputForActor(actorId: string, videoUrl: string, language: string): Record<string, unknown> {
  if (actorId === "pintostudio/youtube-transcript-scraper") {
    return {
      videoUrl,
      targetLanguage: language,
    };
  }

  return {
    urls: [videoUrl],
    subtitleLanguage: language,
    saveCaptionsJson: true,
    saveFullTranscript: true,
    saveRichDataset: true,
    proxy: {
      useApifyProxy: true,
    },
  };
}

async function runApifyTranscriptActor({
  actorId,
  videoUrl,
  language,
  timeoutSeconds,
  token,
}: {
  actorId: string;
  videoUrl: string;
  language: string;
  timeoutSeconds: string;
  token: string;
}): Promise<TranscriptFetchResult> {
  const actorPath = toApifyActorPath(actorId);
  const input = apifyInputForActor(actorId, videoUrl, language);

  const runUrl = new URL(`https://api.apify.com/v2/acts/${actorPath}/runs`);
  runUrl.searchParams.set("token", token);
  runUrl.searchParams.set("waitForFinish", timeoutSeconds);

  const res = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorData = (await res.json().catch(() => null)) as unknown;
    return {
      transcript: null,
      reason: "apify_failed",
      message: "Apify transcript pull failed. Paste a transcript result or upload permitted audio/video.",
      details: {
        actorId,
        status: res.status,
        error: errorData && typeof errorData === "object" ? (errorData as Record<string, unknown>).error : undefined,
      },
    };
  }

  const rawRunData = (await res.json()) as unknown;
  const runData = rawRunData as ApifyRunResponse;
  const runRecord =
    rawRunData && typeof rawRunData === "object" && "data" in rawRunData && (rawRunData as Record<string, unknown>).data && typeof (rawRunData as Record<string, unknown>).data === "object"
      ? ((rawRunData as Record<string, unknown>).data as Record<string, unknown>)
      : rawRunData && typeof rawRunData === "object"
        ? (rawRunData as Record<string, unknown>)
        : {};
  const runId = runData.data?.id || textFromUnknown(runRecord.id);
  const runStatus = runData.data?.status || textFromUnknown(runRecord.status);
  const datasetId = runData.data?.defaultDatasetId || textFromUnknown(runRecord.defaultDatasetId);

  let datasetItems: unknown[] = [];
  if (datasetId) {
    const datasetUrl = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);
    datasetUrl.searchParams.set("token", token);
    datasetUrl.searchParams.set("format", "json");
    datasetUrl.searchParams.set("clean", "true");
    const datasetRes = await fetch(datasetUrl, { cache: "no-store" });
    if (datasetRes.ok) {
      datasetItems = arrayFromUnknown(await datasetRes.json());
    }
  }

  const transcript = transcriptFromApifyItems(datasetItems);
  if (!transcript) {
    const firstItem = datasetItems.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
    const firstKeys = firstItem ? Object.keys(firstItem).slice(0, 20) : [];
    const itemMessage =
      textFromUnknown(firstItem?.message) ||
      textFromUnknown(firstItem?.error) ||
      textFromUnknown(firstItem?.reason) ||
      textFromUnknown(firstItem?.status_message);
    return {
      transcript: null,
      reason: "apify_empty",
      message: itemMessage
        ? `Apify returned a result but no transcript text was found: ${itemMessage}`
        : "Apify did not return a transcript for this video. Paste a transcript result or upload permitted audio/video.",
      details: {
        actorId,
        runId,
        runStatus,
        datasetId,
        itemCount: datasetItems.length,
        firstKeys,
        logTail: runId
          ? logTail(await fetch(`https://api.apify.com/v2/logs/${runId}?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then((logRes) => logRes.ok ? logRes.text() : "").catch(() => ""))
          : "",
      },
    };
  }

  return {
    transcript,
    reason: "apify_imported",
    message: "Transcript imported via Apify.",
  };
}

async function transcribeWithOpenAi(file: File, apiKey: string, model: string) {
  const upload = new FormData();
  upload.set("file", file, file.name || "youtube-source.mp4");
  upload.set("model", model);
  upload.set("response_format", "json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upload,
  });
  if (!res.ok) return null;
  return (await res.json()) as { text?: string; language?: string };
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Upload an audio or video file for transcription." }, { status: 400 });
      }
      const apiKey = await getServerSecretAsync("OPENAI_API_KEY");
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key is required for uploaded audio/video transcription." },
          { status: 400 },
        );
      }
      const preferredModel = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe";
      const data =
        (await transcribeWithOpenAi(file, apiKey, preferredModel)) ??
        (preferredModel === "whisper-1" ? null : await transcribeWithOpenAi(file, apiKey, "whisper-1"));
      if (!data) {
        return NextResponse.json({ error: "OpenAI transcription failed." }, { status: 502 });
      }
      const transcript = {
        ...parseManualTranscript(data.text ?? ""),
        source: "uploaded_transcription" as const,
        language: data.language,
      };
      return NextResponse.json({ transcript });
    }

    const body = (await req.json().catch(() => ({}))) as {
      videoId?: string;
      url?: string;
      manualTranscript?: string;
      source?: "youtube_api" | "manual_paste" | "uploaded_transcription";
    };

    if (body.manualTranscript?.trim()) {
      return NextResponse.json({ transcript: parseManualTranscript(body.manualTranscript) });
    }

    if (body.videoId?.trim()) {
      const result = await fetchOwnedChannelTranscript(body.videoId.trim());
      if (result.transcript) return NextResponse.json(result);

      const videoUrl = body.url?.trim() || `https://www.youtube.com/watch?v=${body.videoId.trim()}`;
      const apifyResult = await fetchApifyTranscript(videoUrl);
      if (apifyResult.transcript) return NextResponse.json(apifyResult);

      return NextResponse.json(
        {
          transcript: null,
          fallbackRequired: true,
          reason: apifyResult.reason === "apify_missing" ? result.reason : apifyResult.reason,
          message:
            apifyResult.reason === "apify_missing"
              ? `${result.message} Add APIFY_API_TOKEN for public transcript pulls, or paste/upload a transcript result.`
              : apifyResult.message,
          details: apifyResult.details,
        },
        { status: 202 },
      );
    }

    return NextResponse.json(
      {
        transcript: null,
        fallbackRequired: true,
        message:
          "Captions were not imported automatically. Use YouTube OAuth/Captions API for owned channels, paste the transcript manually, or upload audio/video for transcription.",
      },
      { status: 202 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcript import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
