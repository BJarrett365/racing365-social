import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { mergeStoredSettingsAsync, readStoredSettingsAsync, type AdminStoredSettings } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  deeplApiKey?: string;
  deeplApiUrl?: string;
  languageProviderMode?: "openai" | "deepl" | "deepl-openai";
  languageOpenaiModel?: string;
  clearDeeplKey?: boolean;
};

function maskPreview(v: string | undefined) {
  const raw = (v ?? "").trim();
  if (!raw) return "";
  const suffix = raw.length > 6 ? raw.slice(-4) : "";
  return `${"•".repeat(Math.max(12, Math.min(40, raw.length)))}${suffix ? ` ${suffix}` : ""}`;
}

export async function GET() {
  const s = await readStoredSettingsAsync();
  const storedDeeplKey = s.deeplApiKey?.trim();
  const envDeeplKey = process.env.DEEPL_API_KEY?.trim();
  const deeplConfigured = Boolean(storedDeeplKey || envDeeplKey);
  const deeplApiKeyMasked = storedDeeplKey
    ? maskPreview(storedDeeplKey)
    : envDeeplKey
      ? `${"•".repeat(14)} (environment)`
      : "";
  const deeplApiUrl =
    s.deeplApiUrl?.trim() ||
    process.env.DEEPL_API_URL?.trim() ||
    "";
  return NextResponse.json({
    providerMode: s.languageProviderMode ?? "openai",
    openaiModel: s.languageOpenaiModel ?? "gpt-4o-mini",
    openaiConfigured: Boolean(s.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim()),
    deeplConfigured,
    deeplApiKeyMasked,
    deeplKeySource: storedDeeplKey ? "admin" : envDeeplKey ? "environment" : "none",
    deeplApiUrl,
    adminTokenRequired: Boolean(process.env.ADMIN_TOKEN?.trim()),
  });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const denied = assertAdminWrite(req, body.adminToken);
  if (denied) return denied;
  const clearKeys: (keyof AdminStoredSettings)[] = [];
  if (body.clearDeeplKey) clearKeys.push("deeplApiKey");
  const partial: Partial<AdminStoredSettings> = {};
  if (body.deeplApiKey?.trim()) partial.deeplApiKey = body.deeplApiKey.trim();
  if (body.deeplApiUrl?.trim()) partial.deeplApiUrl = body.deeplApiUrl.trim();
  if (body.languageProviderMode === "openai" || body.languageProviderMode === "deepl" || body.languageProviderMode === "deepl-openai") {
    partial.languageProviderMode = body.languageProviderMode;
  }
  if (body.languageOpenaiModel?.trim()) partial.languageOpenaiModel = body.languageOpenaiModel.trim();
  await mergeStoredSettingsAsync(partial, clearKeys);
  return NextResponse.json({ ok: true });
}
