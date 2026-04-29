import { buildContextBlock } from "@/features/editing-studio/ai/editing-ai-brand-context";
import { editingOpenAiCompletion, editingOpenAiJsonObject } from "@/features/editing-studio/services/editing-ai-openai";

export type RewriteIntent =
  | "rewrite_x"
  | "rewrite_facebook"
  | "rewrite_linkedin"
  | "rewrite_instagram"
  | "shorten"
  | "expand"
  | "punchier"
  | "neutral"
  | "urgent"
  | "add_cta"
  | "push_notification";

const REWRITE_SYSTEM = `You are an expert sports and news social copy editor. Obey the brand voice. Return plain text only — no markdown fences, no quotes around the whole output, no preamble.`;

function rewriteInstruction(intent: RewriteIntent): string {
  switch (intent) {
    case "rewrite_x":
      return "Rewrite the SOURCE for X (Twitter): aim for ~280 characters or fewer; punchy; no thread unless essential; avoid stuffing hashtags.";
    case "rewrite_facebook":
      return "Rewrite the SOURCE for Facebook: conversational, paragraph breaks welcome; 1–2 short paragraphs; optional emoji sparingly.";
    case "rewrite_linkedin":
      return "Rewrite the SOURCE for LinkedIn: professional, insight-led; one short hook then value; avoid hype.";
    case "rewrite_instagram":
      return "Rewrite the SOURCE for Instagram: caption-first; line breaks ok; 2–5 short lines; hashtags optional at end.";
    case "shorten":
      return "Shorten the SOURCE while keeping the key claim and tone.";
    case "expand":
      return "Expand the SOURCE with one extra sentence of context — still suitable for social.";
    case "punchier":
      return "Make the SOURCE more punchy and direct; same facts; avoid clickbait.";
    case "neutral":
      return "Make the SOURCE more neutral and factual; reduce hype and emotional language.";
    case "urgent":
      return "Add urgency without sensationalism — still accurate and brand-safe.";
    case "add_cta":
      return "Add a clear short call-to-action to the SOURCE (one line or sentence) if missing; otherwise improve the CTA.";
    case "push_notification":
      return "Rewrite the SOURCE as a mobile push notification: max ~120 characters; title-style urgency; no emoji unless essential.";
    default:
      return "Rewrite the SOURCE.";
  }
}

export function clampSource(sourceText: string): string {
  return sourceText.slice(0, 48_000);
}

export async function runRewriteAi(input: {
  intent: RewriteIntent;
  sourceText: string;
  brand?: string;
  title?: string;
  summary?: string;
}): Promise<{ text: string }> {
  const source = clampSource(input.sourceText.trim());
  if (!source) throw new Error("Source text is empty.");

  const ctx = buildContextBlock({ title: input.title, summary: input.summary, brand: input.brand });
  const user = [
    ctx,
    "",
    "Instruction:",
    rewriteInstruction(input.intent),
    "",
    "SOURCE:",
    source,
  ].join("\n");

  const text = await editingOpenAiCompletion({
    system: REWRITE_SYSTEM,
    user,
    temperature: 0.45,
  });
  return { text };
}

export async function runHeadlinesOrCaptionsAi(input: {
  mode: "headlines" | "captions";
  sourceText: string;
  brand?: string;
  title?: string;
  summary?: string;
  count?: number;
}): Promise<{ options: string[] }> {
  const source = clampSource(input.sourceText.trim());
  if (!source) throw new Error("Source text is empty.");
  const count = Math.min(8, Math.max(2, input.count ?? 3));

  const ctx = buildContextBlock({ title: input.title, summary: input.summary, brand: input.brand });
  const modeLine =
    input.mode === "headlines"
      ? `Return exactly ${count} distinct headline options (public-facing, single line each).`
      : `Return exactly ${count} distinct social caption options (short blocks, suitable for the main post).`;

  const system = `You are a sports editorial copywriter. Return JSON only with shape {"options": string[]}. ${modeLine} No duplicates. Plain text only inside strings.`;

  const user = [ctx, "", modeLine, "", "SOURCE:", source].join("\n");

  const raw = await editingOpenAiJsonObject({
    system,
    user,
    temperature: 0.55,
  });

  const obj = raw as { options?: unknown };
  if (!Array.isArray(obj.options)) throw new Error("Invalid response shape.");
  const options = obj.options
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, count);

  if (options.length === 0) throw new Error("No options returned.");
  return { options };
}

export async function runHashtagsAi(input: {
  sourceText: string;
  brand?: string;
  title?: string;
  summary?: string;
}): Promise<{ hashtags: string[] }> {
  const source = clampSource(input.sourceText.trim());
  if (!source) throw new Error("Source text is empty.");

  const ctx = buildContextBlock({ title: input.title, summary: input.summary, brand: input.brand });
  const system = `You suggest social hashtags for sports content. Return JSON only: {"hashtags": string[]} with 6–12 hashtags, each starting with #, no duplicates, relevant to the source.`;

  const user = [ctx, "", "SOURCE:", source].join("\n");

  const raw = await editingOpenAiJsonObject({
    system,
    user,
    temperature: 0.5,
  });

  const obj = raw as { hashtags?: unknown };
  if (!Array.isArray(obj.hashtags)) throw new Error("Invalid response shape.");
  const hashtags = obj.hashtags
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 16);

  if (hashtags.length === 0) throw new Error("No hashtags returned.");
  return { hashtags };
}

export async function runPinnedCommentAi(input: {
  sourceText: string;
  brand?: string;
  title?: string;
  summary?: string;
}): Promise<{ text: string }> {
  const source = clampSource(input.sourceText.trim());
  if (!source) throw new Error("Source text is empty.");

  const ctx = buildContextBlock({ title: input.title, summary: input.summary, brand: input.brand });
  const user = [
    ctx,
    "",
    "Write ONE first pinned-comment style text for this post (platform-agnostic): welcoming, adds context or question, no spam.",
    "",
    "SOURCE:",
    source,
  ].join("\n");

  const text = await editingOpenAiCompletion({
    system: REWRITE_SYSTEM,
    user,
    temperature: 0.45,
  });
  return { text };
}

export async function runSummariseAi(input: {
  sourceText: string;
  brand?: string;
  title?: string;
  summary?: string;
  mode?: "key_points";
}): Promise<{ points: string[] }> {
  const source = clampSource(input.sourceText.trim());
  if (!source) throw new Error("Source text is empty.");

  const ctx = buildContextBlock({ title: input.title, summary: input.summary, brand: input.brand });
  const system = `You extract editorial key points. Return JSON only: {"points": string[]}. 5–8 bullet-style short lines, no numbering prefix in strings.`;

  const user = [ctx, "", "Extract key points from SOURCE:", "", source].join("\n");

  const raw = await editingOpenAiJsonObject({
    system,
    user,
    temperature: 0.25,
  });

  const obj = raw as { points?: unknown };
  if (!Array.isArray(obj.points)) throw new Error("Invalid response shape.");
  const points = obj.points
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (points.length === 0) throw new Error("No key points returned.");
  return { points };
}
