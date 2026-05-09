import { NextResponse } from "next/server";
import { maskedApiKey } from "@/app/lib/language-studio/client-access";
import { deleteClient, newLanguageId, readLanguageStudioData, sortDesc, upsertClient } from "@/app/lib/language-studio/store";
import type { LanguageClient, LanguageCode, LanguageSportContext } from "@/app/lib/language-studio/types";
import { LANGUAGE_SPORT_CONTEXTS } from "@/app/lib/language-studio/types";

type Body = Partial<LanguageClient>;

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function arrayOfSportContexts(value: unknown): LanguageSportContext[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LanguageSportContext => typeof item === "string" && LANGUAGE_SPORT_CONTEXTS.includes(item as LanguageSportContext));
}

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({
    clients: sortDesc(Object.values(data.clients)),
    apiKeys: sortDesc(Object.values(data.clientApiKeys)).map(maskedApiKey),
    accessLogs: sortDesc(Object.values(data.clientAccessLogs)).slice(0, 100),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.name?.trim()) return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  const data = await readLanguageStudioData();
  const now = new Date().toISOString();
  const name = body.name.trim();
  const id = body.id?.trim();
  const existing = id ? data.clients[id] : Object.values(data.clients).find((client) => client.name.trim().toLowerCase() === name.toLowerCase());
  const row: LanguageClient = {
    id: existing?.id || id || newLanguageId("lclient"),
    name,
    contactEmail: body.contactEmail?.trim() || "",
    active: body.active ?? true,
    allowedBrands: arrayOfStrings(body.allowedBrands),
    allowedLanguages: arrayOfStrings(body.allowedLanguages) as LanguageCode[],
    allowedSports: body.allowedSports !== undefined ? arrayOfSportContexts(body.allowedSports) : (existing?.allowedSports ?? []),
    allowedFormats: (arrayOfStrings(body.allowedFormats).filter((format) => format === "xml" || format === "json") as Array<"xml" | "json">),
    notes: body.notes?.trim() || "",
    createdAt: body.createdAt || existing?.createdAt || now,
    updatedAt: now,
  };
  if (row.allowedFormats.length === 0) row.allowedFormats = ["xml", "json"];
  await upsertClient(row);
  return NextResponse.json({ success: true, client: row });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Client id is required." }, { status: 400 });
  const deleted = await deleteClient(id);
  if (!deleted) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
