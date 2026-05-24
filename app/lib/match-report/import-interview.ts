import "server-only";

import type { EditorialProfile, InterviewIntelligence, InterviewQuote } from "@/app/lib/match-report/types";
import { generateYouTubeScriptOutput } from "@/app/lib/youtube-script/ai";
import { fetchYouTubeTranscriptForVideo } from "@/app/lib/youtube-script/fetch-transcript";
import { fetchYouTubeMetadata } from "@/app/lib/youtube-script/metadata";
import type { TranscriptResult, YouTubeVideoMeta } from "@/app/lib/youtube-script/types";
import { extractYouTubeVideoId } from "@/app/lib/youtube-script/utils";
import { createLanguageArticleFromYouTubeTranscript } from "@/app/lib/youtube-script/language-studio-bridge";

export type InterviewImportContext = {
  editorial?: Partial<EditorialProfile>;
  generateSummary?: boolean;
  team?: InterviewIntelligence["team"];
};

function quotesFromTranscript(text: string): InterviewQuote[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const quotes: InterviewQuote[] = [];
  for (const line of lines) {
    if (line.length < 40) continue;
    quotes.push({ speaker: "Interview", quote: line.slice(0, 400) });
    if (quotes.length >= 8) break;
  }
  return quotes;
}

function buildInterviewDigest(input: {
  title?: string;
  channelName?: string;
  summary?: string;
  quotes: InterviewQuote[];
  transcriptText?: string;
}): string {
  const parts: string[] = [];
  if (input.title) {
    parts.push(`Source: ${input.title}${input.channelName ? ` (${input.channelName})` : ""}`);
  }
  if (input.summary?.trim()) parts.push(`Summary:\n${input.summary.trim()}`);
  if (input.quotes.length) {
    parts.push(`Quotes:\n${input.quotes.map((q) => `"${q.quote}" — ${q.speaker}`).join("\n")}`);
  } else if (input.transcriptText?.trim()) {
    parts.push(`Transcript excerpt:\n${input.transcriptText.trim().slice(0, 1200)}`);
  }
  return parts.join("\n\n");
}

async function fetchTranscriptFromApi(videoId: string, url: string): Promise<{
  transcript: TranscriptResult | null;
  message?: string;
  reason?: string;
}> {
  const origin = process.env.URL?.trim() || "http://localhost:3000";
  const res = await fetch(`${origin}/api/youtube/transcript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, url }),
  });
  const data = (await res.json()) as {
    transcript?: TranscriptResult;
    message?: string;
    reason?: string;
    error?: string;
  };
  if (data.transcript?.fullText?.trim()) {
    return { transcript: data.transcript, message: data.message, reason: data.reason };
  }
  if (!res.ok && res.status !== 202) {
    throw new Error(data.error || data.message || "Transcript fetch failed.");
  }
  return {
    transcript: null,
    message:
      data.message
      || "Captions were not imported automatically. Configure APIFY_API_TOKEN in Admin settings, or use the YouTube Script Importer to paste a transcript.",
    reason: data.reason,
  };
}

async function generateInterviewSummary(
  meta: YouTubeVideoMeta,
  transcript: TranscriptResult,
  editorial?: Partial<EditorialProfile>,
): Promise<string | undefined> {
  try {
    const output = await generateYouTubeScriptOutput({
      meta,
      transcript,
      outputType: "summary",
      brandTone: editorial?.brandStyle?.split("—")[0]?.trim() || editorial?.brandStyle || "Match report editorial",
      contentStyle: editorial?.contentStyle || "Match report",
      sportContext: editorial?.sport || "Football",
      rewriteStyle: editorial?.rewriteStyle,
      journalistProfileName: editorial?.creatorName,
      journalistStyle: editorial?.creatorStyleNotes,
    });
    return output.content.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function fetchInterviewFromYoutube(
  sourceUrl: string,
  context: InterviewImportContext = {},
): Promise<InterviewIntelligence> {
  const videoId = extractYouTubeVideoId(sourceUrl);
  if (!videoId) throw new Error("Invalid YouTube URL.");

  const meta = await fetchYouTubeMetadata(videoId);
  const transcriptResult = await fetchYouTubeTranscriptForVideo(videoId, sourceUrl.trim());
  const transcript = transcriptResult.transcript;
  if (!transcript?.fullText?.trim()) {
    throw new Error(
      transcriptResult.message
      || "Captions were not imported automatically. Configure APIFY_API_TOKEN in Admin settings, or use the YouTube Script Importer to paste a transcript.",
    );
  }

  const generateSummary = context.generateSummary !== false;
  const summary = generateSummary
    ? await generateInterviewSummary(meta, transcript, context.editorial)
    : undefined;
  const quotes = quotesFromTranscript(transcript.fullText);
  const digest = buildInterviewDigest({
    title: meta.title,
    channelName: meta.channelName,
    summary,
    quotes,
    transcriptText: transcript.fullText,
  });

  return {
    id: `int-${Date.now().toString(36)}`,
    sourceUrl: sourceUrl.trim(),
    videoId,
    title: meta.title,
    channelName: meta.channelName,
    ...(context.team ? { team: context.team } : {}),
    transcriptText: transcript.fullText,
    transcriptSource: transcript.source,
    summary,
    quotes,
    themes: [],
    digest,
    importedAt: new Date().toISOString(),
  };
}

export async function sendInterviewToLanguageStudioRewrite(
  interview: InterviewIntelligence,
): Promise<{ articleId: string; title: string }> {
  if (!interview.videoId || !interview.transcriptText?.trim()) {
    throw new Error("Interview is missing transcript data.");
  }
  const meta: YouTubeVideoMeta = {
    videoId: interview.videoId,
    url: interview.sourceUrl,
    title: interview.title || interview.videoId,
    channelName: interview.channelName,
  };
  const transcript: TranscriptResult = {
    source: interview.transcriptSource || "apify",
    fullText: interview.transcriptText,
    segments: [{ text: interview.transcriptText }],
    hasTimestamps: false,
  };
  const article = await createLanguageArticleFromYouTubeTranscript(meta, transcript, {
    summary: interview.summary,
    forRewrite: true,
    editorNotes: "Sent from Match Report Builder transcript import.",
  });
  return { articleId: article.id, title: article.title };
}
