import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { loadAiProviderConfig, getAiCallLogs } from "@/app/lib/ai";
import { mergeStoredSettingsAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";

type PostBody = {
  adminToken?: string;
  defaultAiProvider?: "openai" | "deepseek";
  enableDeepseek?: boolean;
  deepseekApiKey?: string;
  clearDeepseekKey?: boolean;
};

export async function GET() {
  const config = await loadAiProviderConfig();
  const settings = await readStoredSettingsAsync();
  const logs = getAiCallLogs({ limit: 20 });
  return NextResponse.json({
    config: {
      defaultProvider: config.defaultProvider,
      enableDeepseek: config.enableDeepseek,
      openaiConfigured: config.openaiConfigured,
      deepseekConfigured: config.deepseekConfigured,
    },
    deepseekKeyConfigured: Boolean(settings.deepseekApiKey?.trim()),
    recentLogs: logs.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      task: e.task,
      provider: e.provider,
      model: e.model,
      latencyMs: e.latencyMs,
      costEstimateUsd: e.costEstimateUsd,
      fallbackUsed: e.fallbackUsed,
      success: e.success,
      errorReason: e.errorReason,
    })),
  });
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const clearKeys: Array<"deepseekApiKey"> = [];
  if (body.clearDeepseekKey) clearKeys.push("deepseekApiKey");

  const partial: Record<string, unknown> = {};
  if (body.defaultAiProvider === "openai" || body.defaultAiProvider === "deepseek") {
    partial.defaultAiProvider = body.defaultAiProvider;
  }
  if (typeof body.enableDeepseek === "boolean") {
    partial.enableDeepseek = body.enableDeepseek;
  }
  if (body.deepseekApiKey?.trim()) {
    partial.deepseekApiKey = body.deepseekApiKey.trim();
  }

  await mergeStoredSettingsAsync(partial, clearKeys);
  const config = await loadAiProviderConfig();
  return NextResponse.json({ ok: true, config });
}
