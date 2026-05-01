import { getServerSecretAsync } from "@/app/lib/server-secrets";
import type {
  ScriptOutputType,
  TranscriptResult,
  YouTubeGeneratedOutput,
  YouTubeVideoMeta,
} from "@/app/lib/youtube-script/types";
import { scriptOutputLabels, transcriptToSrt, transcriptToText } from "@/app/lib/youtube-script/utils";

type GenerateInput = {
  meta: YouTubeVideoMeta;
  transcript: TranscriptResult;
  outputType: ScriptOutputType;
  brandTone?: string;
  outputLanguage?: string;
  contentStyle?: string;
  sportContext?: string;
  rewriteStyle?: string;
  journalistProfileName?: string;
  journalistStyle?: string;
};

function fallbackOutput(input: GenerateInput): string {
  const text = transcriptToText(input.transcript);
  if (input.outputType === "subtitles") return transcriptToSrt(input.transcript);
  if (input.outputType === "clean_transcript") return text;
  if (input.outputType === "article") {
    return [
      `# ${input.meta.title} - ${input.meta.channelName ?? "YouTube"}`,
      "",
      `${input.meta.channelName ?? "The source channel"} shared the discussion in the video transcript below. Use OpenAI to turn this into a polished article when an API key is configured.`,
      "",
      "## Source transcript",
      "",
      text.slice(0, 4000),
    ].join("\n");
  }
  if (input.outputType === "translation") {
    return `Translation requested for ${input.outputLanguage ?? "selected language"}.\n\n${text}`;
  }
  return `${scriptOutputLabels[input.outputType]}\n\n${input.meta.title}\n\n${text.slice(0, 4000)}`;
}

function outputRules(outputType: ScriptOutputType): string {
  if (outputType === "article") {
    return [
      "Create a full publishable article from the transcript.",
      "Use a headline that includes the video title and channel name.",
      "Suggested headline format: '[Video title] - Leeds United Official' when the channel is Leeds United Official.",
      "Include a standfirst, body copy, and a short source note.",
      "Include direct quotes from the transcript only; wrap quoted words in quotation marks.",
      "Attribute quotes to the speaker when the transcript makes that clear, otherwise use neutral wording such as 'Rodon said' only if grounded by the title/transcript.",
      "Do not mention unknown duration or unknown publish date in the article body unless those values are known.",
      "Write in a clean football news feature style for Plexa.",
    ].join(" ");
  }
  if (outputType === "podcast_script") {
    return "Generate in this exact speaker-label format only: HOST: text, CO-HOST: text, GUEST: text, NARRATOR: text. Do not use markdown tables.";
  }
  if (outputType === "shorts_script") {
    return "Return sections: hook, 3-5 key beats, suggested visuals, caption text, title, hashtags, optional voiceover script.";
  }
  if (outputType === "quote_clips") {
    return "Return quote clips with quote, speaker if known, start time, end time, why it is useful, and suggested caption. Do not invent quotes or timestamps.";
  }
  if (outputType === "social_captions") {
    return "Create editable platform captions for X, Facebook, Instagram, TikTok, YouTube, WhatsApp and Telegram.";
  }
  if (outputType === "subtitles") {
    return "Return SRT subtitle text only. Preserve existing timestamps where present; otherwise use sensible sequential timings.";
  }
  if (outputType === "translation") {
    return "Translate the transcript-derived content into the requested output language, preserving all facts and quote boundaries.";
  }
  if (outputType === "summary") {
    return "Create an article-style summary with headline, standfirst and concise body.";
  }
  if (outputType === "video_script") {
    return "Create a clean video script with presenter-ready wording and scene cues only where grounded in the transcript.";
  }
  return "Clean the transcript for readability while preserving the original meaning and facts.";
}

export async function generateYouTubeScriptOutput(input: GenerateInput): Promise<YouTubeGeneratedOutput> {
  const now = new Date().toISOString();
  const fallback = fallbackOutput(input);
  const apiKey = await getServerSecretAsync("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      id: `yt-output-${Date.now().toString(36)}`,
      type: input.outputType,
      title: scriptOutputLabels[input.outputType],
      content: fallback,
      language: input.outputLanguage,
      createdAt: now,
    };
  }

  const transcriptText = transcriptToText(input.transcript).slice(0, 60000);
  const prompt = [
    `Video title: ${input.meta.title}`,
    `Channel: ${input.meta.channelName ?? "Unknown"}`,
    `Duration: ${input.meta.durationSeconds ? `${input.meta.durationSeconds} seconds` : "Unknown duration"}`,
    `Published at: ${input.meta.publishedAt ?? "Publish date unknown"}`,
    `Output type: ${scriptOutputLabels[input.outputType]}`,
    `Content style: ${input.contentStyle?.trim() || "News"}`,
    `Sport: ${input.sportContext?.trim() || "Football"}`,
    `Brand tone: ${input.brandTone?.trim() || "Plexa editorial, clear and useful"}`,
    `Output language: ${input.outputLanguage?.trim() || "British English"}`,
    input.rewriteStyle?.trim() ? `Style instructions: ${input.rewriteStyle.trim()}` : "",
    input.journalistProfileName?.trim() ? `Use journalist profile: ${input.journalistProfileName.trim()}` : "",
    input.journalistStyle?.trim() ? `Journalist style: ${input.journalistStyle.trim()}` : "",
    "Rules:",
    "- Keep facts from the transcript only.",
    "- Do not invent quotes, names, numbers, claims or timestamps.",
    "- Use British English by default unless another output language is requested.",
    "- Keep timestamps linked to transcript segments where possible.",
    `- ${outputRules(input.outputType)}`,
    "",
    "Transcript:",
    transcriptText,
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Plexa YouTube Script Importer. Produce useful editorial outputs from transcripts, obeying compliance and fact-preservation rules.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) throw new Error("OpenAI generation failed");
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || fallback;
    return {
      id: `yt-output-${Date.now().toString(36)}`,
      type: input.outputType,
      title: scriptOutputLabels[input.outputType],
      content,
      language: input.outputLanguage,
      createdAt: now,
    };
  } catch {
    return {
      id: `yt-output-${Date.now().toString(36)}`,
      type: input.outputType,
      title: scriptOutputLabels[input.outputType],
      content: fallback,
      language: input.outputLanguage,
      createdAt: now,
    };
  }
}
