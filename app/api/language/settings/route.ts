import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { mergeStoredSettings, readStoredSettings, type AdminStoredSettings } from "@/app/lib/server-secrets";

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
  const s = readStoredSettings();
  return NextResponse.json({
    providerMode: s.languageProviderMode ?? "openai",
    openaiModel: s.languageOpenaiModel ?? "gpt-4o-mini",
    openaiConfigured: Boolean(s.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim()),
    deeplConfigured: Boolean(s.deeplApiKey?.trim() || process.env.DEEPL_API_KEY?.trim()),
    deeplApiKeyMasked: maskPreview(s.deeplApiKey),
    deeplApiUrl: s.deeplApiUrl ?? "",
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
  mergeStoredSettings(partial, clearKeys);
  return NextResponse.json({ ok: true });
}
