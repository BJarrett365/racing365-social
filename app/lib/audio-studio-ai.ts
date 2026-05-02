import { getServerSecretAsync } from "@/app/lib/server-secrets";

export type AudioNotesPayload = {
  title: string;
  summary: string;
  cleanNotes: string[];
  keyPoints: string[];
  actionPoints: string[];
  quotes: string[];
  headlines: string[];
  socialPostIdeas: string[];
};

export type AudioTranscriptSegment = {
  id: string;
  start?: number;
  end?: number;
  text: string;
  speakerId?: string;
};

export function parseJsonObject<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return fallback;
    }
  }
}

export function normaliseOpenAiTranscriptionLanguage(language?: string): string | undefined {
  const value = language?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === "auto" || value === "detect" || value === "auto-detect") return undefined;
  const languageMap: Record<string, string> = {
    english: "en",
    en: "en",
    spanish: "es",
    espanol: "es",
    "español": "es",
    es: "es",
    french: "fr",
    francais: "fr",
    "français": "fr",
    fr: "fr",
    german: "de",
    deutsch: "de",
    de: "de",
    italian: "it",
    italiano: "it",
    it: "it",
    portuguese: "pt",
    portugues: "pt",
    "português": "pt",
    pt: "pt",
    arabic: "ar",
    ar: "ar",
    japanese: "ja",
    ja: "ja",
  };
  const mapped = languageMap[value];
  if (mapped) return mapped;
  return /^[a-z]{2}$/.test(value) ? value : undefined;
}

export async function transcribeWithOpenAi(file: File, language?: string): Promise<{
  text: string;
  language?: string;
  segments: AudioTranscriptSegment[];
}> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is required for OpenAI transcription");

  const form = new FormData();
  form.set("file", file);
  form.set("model", "whisper-1");
  form.set("response_format", "verbose_json");
  form.set("timestamp_granularities[]", "segment");
  const languageCode = normaliseOpenAiTranscriptionLanguage(language);
  if (languageCode) form.set("language", languageCode);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI transcription failed (${res.status}): ${error.slice(0, 500)}`);
  }

  const data = await res.json() as {
    text?: string;
    language?: string;
    segments?: Array<{ id?: number; start?: number; end?: number; text?: string }>;
  };

  const segments = (data.segments ?? [])
    .filter((segment) => segment.text?.trim())
    .map((segment, index) => ({
      id: `seg_${segment.id ?? index}`,
      start: segment.start,
      end: segment.end,
      text: segment.text?.trim() ?? "",
    }));

  return {
    text: data.text?.trim() ?? segments.map((segment) => segment.text).join("\n"),
    language: data.language,
    segments,
  };
}

export async function generateAudioNotes(transcript: string, context?: string): Promise<AudioNotesPayload> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is required for Audio Studio notes");

  const fallback: AudioNotesPayload = {
    title: "Audio Notes",
    summary: transcript.slice(0, 500),
    cleanNotes: [],
    keyPoints: [],
    actionPoints: [],
    quotes: [],
    headlines: [],
    socialPostIdeas: [],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Plexa Audio Studio. Convert transcripts into clean editorial notes for sports and publisher teams. Return strict JSON with title, summary, cleanNotes, keyPoints, actionPoints, quotes, headlines and socialPostIdeas arrays.",
        },
        {
          role: "user",
          content: `Context: ${context || "General editorial audio"}\n\nTranscript:\n${transcript.slice(0, 24000)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI notes failed (${res.status}): ${error.slice(0, 500)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonObject<AudioNotesPayload>(content, fallback);
  return {
    title: String(parsed.title || fallback.title),
    summary: String(parsed.summary || fallback.summary),
    cleanNotes: arrayOfStrings(parsed.cleanNotes),
    keyPoints: arrayOfStrings(parsed.keyPoints),
    actionPoints: arrayOfStrings(parsed.actionPoints),
    quotes: arrayOfStrings(parsed.quotes),
    headlines: arrayOfStrings(parsed.headlines),
    socialPostIdeas: arrayOfStrings(parsed.socialPostIdeas),
  };
}

export async function generateAudioTitle(transcript: string, context?: string): Promise<string> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is required for Audio Studio title generation");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Create a short, clear title for an audio file in a media production tool. Return only the title, no quotes and no extra explanation.",
        },
        {
          role: "user",
          content: `Context: ${context || "Audio Studio media"}\n\nTranscript:\n${transcript.slice(0, 8000)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI title generation failed (${res.status}): ${error.slice(0, 500)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return sanitiseTitle(data.choices?.[0]?.message?.content);
}

export async function generateAudioTitleFromFile(file: File, language?: string): Promise<string> {
  const transcript = await transcribeWithOpenAi(file, language);
  return generateAudioTitle(transcript.text, file.name);
}

export async function translateAudioTranscript(text: string, language: string): Promise<string> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is required for Audio Studio translation");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Translate the supplied transcript faithfully. Keep names, brands, timestamps and speaker labels intact.",
        },
        { role: "user", content: `Target language: ${language}\n\n${text.slice(0, 30000)}` },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI translation failed (${res.status}): ${error.slice(0, 500)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function generateArticleOrSocialFromTranscript(
  transcript: string,
  format: "article" | "podcast-script" | "captions" | "social-posts",
): Promise<string> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is required for conversion");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Convert audio transcripts into publisher-ready output for Plexa Studio." },
        { role: "user", content: `Format: ${format}\n\nTranscript:\n${transcript.slice(0, 30000)}` },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI conversion failed (${res.status}): ${error.slice(0, 500)}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function sanitiseTitle(value: unknown): string {
  return String(value ?? "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
