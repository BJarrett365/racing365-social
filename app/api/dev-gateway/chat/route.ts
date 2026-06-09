import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/guards";
import { runDevGatewayChat, type DevGatewayMode, type DevGatewayUploadedFile } from "@/app/lib/dev-gateway/chat";
import { buildDevGatewayContext, type DevGatewayContextKey } from "@/app/lib/dev-gateway/context";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODES = new Set<DevGatewayMode>([
  "ask_openai",
  "ask_cursor",
  "build_cursor_task",
  "review_cursor_plan",
  "review_code",
  "save_learning",
]);

const CONTEXT_KEYS = new Set<DevGatewayContextKey>([
  "article_studio",
  "knowledge_base",
  "language_studio",
  "creator_profiles",
  "prompt_rules",
  "quality_checks",
  "loop_feed",
  "priority_reporters",
  "match_report_builder",
  "brand_guides",
  "recent_dev_notes",
  "current_page_context",
]);

type Body = {
  mode?: string;
  userPrompt?: string;
  contextKeys?: string[];
  currentPage?: string;
  uploadedFiles?: DevGatewayUploadedFile[];
};

function normaliseUploadedFiles(value: unknown): DevGatewayUploadedFile[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      name: String(row.name ?? "uploaded-file").slice(0, 180),
      type: String(row.type ?? "application/octet-stream").slice(0, 120),
      size: Math.max(0, Number(row.size ?? 0)),
      content: String(row.content ?? "").slice(0, 12000),
      dataUrl: typeof row.dataUrl === "string" && row.dataUrl.startsWith("data:image/") ? row.dataUrl.slice(0, 6_000_000) : undefined,
    };
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const mode = MODES.has(body.mode as DevGatewayMode) ? (body.mode as DevGatewayMode) : "ask_openai";
    const userPrompt = body.userPrompt?.trim();
    if (!userPrompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    const contextKeys = (body.contextKeys ?? []).filter((key): key is DevGatewayContextKey =>
      CONTEXT_KEYS.has(key as DevGatewayContextKey),
    );
    const selectedContext = await buildDevGatewayContext(contextKeys, body.currentPage);
    const result = await runDevGatewayChat({
      mode,
      userPrompt,
      selectedContext,
      currentPage: body.currentPage,
      uploadedFiles: normaliseUploadedFiles(body.uploadedFiles),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dev Gateway chat failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
