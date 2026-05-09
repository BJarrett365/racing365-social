import { NextResponse } from "next/server";
import { generateClientApiKey, hashClientApiKey, keyPrefix, maskedApiKey } from "@/app/lib/language-studio/client-access";
import { newLanguageId, readLanguageStudioData, upsertClientApiKey } from "@/app/lib/language-studio/store";
import type { LanguageClientApiKey, LanguageCode, LanguageSportContext } from "@/app/lib/language-studio/types";
import { LANGUAGE_SPORT_CONTEXTS } from "@/app/lib/language-studio/types";

type Body = {
  action?: "create" | "revoke";
  id?: string;
  clientId?: string;
  label?: string;
  allowedBrands?: string[];
  allowedLanguages?: LanguageCode[];
  allowedSports?: LanguageSportContext[];
  allowedFormats?: Array<"xml" | "json">;
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function sportContexts(value: unknown): LanguageSportContext[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LanguageSportContext => typeof item === "string" && LANGUAGE_SPORT_CONTEXTS.includes(item as LanguageSportContext));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const data = await readLanguageStudioData();

  if (body.action === "revoke") {
    const existing = body.id ? data.clientApiKeys[body.id] : undefined;
    if (!existing) return NextResponse.json({ error: "API key not found." }, { status: 404 });
    const row: LanguageClientApiKey = {
      ...existing,
      active: false,
      revokedAt: new Date().toISOString(),
    };
    await upsertClientApiKey(row);
    return NextResponse.json({ success: true, apiKey: maskedApiKey(row) });
  }

  const client = body.clientId ? data.clients[body.clientId] : undefined;
  if (!client) return NextResponse.json({ error: "Client is required." }, { status: 400 });
  const rawKey = generateClientApiKey();
  const formats = strings(body.allowedFormats).filter((format) => format === "xml" || format === "json") as Array<"xml" | "json">;
  const row: LanguageClientApiKey = {
    id: newLanguageId("lclientkey"),
    clientId: client.id,
    label: body.label?.trim() || `${client.name} API key`,
    keyHash: hashClientApiKey(rawKey),
    keyPrefix: keyPrefix(rawKey),
    active: true,
    allowedBrands: strings(body.allowedBrands),
    allowedLanguages: strings(body.allowedLanguages) as LanguageCode[],
    allowedSports: sportContexts(body.allowedSports),
    allowedFormats: formats.length ? formats : client.allowedFormats,
    createdAt: new Date().toISOString(),
  };
  await upsertClientApiKey(row);
  return NextResponse.json({
    success: true,
    apiKey: maskedApiKey(row),
    rawKey,
  });
}
