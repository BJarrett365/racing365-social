import { z } from "zod";

export const rewriteIntentSchema = z.enum([
  "rewrite_x",
  "rewrite_facebook",
  "rewrite_linkedin",
  "rewrite_instagram",
  "shorten",
  "expand",
  "punchier",
  "neutral",
  "urgent",
  "add_cta",
  "push_notification",
]);

export const editingAiRewriteRequestSchema = z.object({
  intent: rewriteIntentSchema,
  sourceText: z.string().min(1).max(50_000),
  brand: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(20_000).optional(),
});

export const editingAiHeadlinesRequestSchema = z.object({
  mode: z.enum(["headlines", "captions"]),
  sourceText: z.string().min(1).max(50_000),
  brand: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(20_000).optional(),
  count: z.number().int().min(2).max(8).optional(),
});

export const editingAiHashtagsRequestSchema = z.object({
  sourceText: z.string().min(1).max(50_000),
  brand: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(20_000).optional(),
});

export const editingAiPinnedCommentRequestSchema = z.object({
  sourceText: z.string().min(1).max(50_000),
  brand: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(20_000).optional(),
});

export const editingAiSummariseRequestSchema = z.object({
  sourceText: z.string().min(1).max(50_000),
  brand: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(20_000).optional(),
  mode: z.literal("key_points").optional(),
});
