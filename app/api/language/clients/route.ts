import { NextResponse } from "next/server";
import { maskedApiKey } from "@/app/lib/language-studio/client-access";
import { deleteClient, newLanguageId, readLanguageStudioData, sortDesc, upsertClient } from "@/app/lib/language-studio/store";
import type { LanguageClient, LanguageCode } from "@/app/lib/language-studio/types";

type Body = Partial<LanguageClient>;

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
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
  const now = new Date().toISOString();
  const row: LanguageClient = {
    id: body.id || newLanguageId("lclient"),
    name: body.name.trim(),
    contactEmail: body.contactEmail?.trim() || "",
    active: body.active ?? true,
    allowedBrands: arrayOfStrings(body.allowedBrands),
    allowedLanguages: arrayOfStrings(body.allowedLanguages) as LanguageCode[],
    allowedFormats: (arrayOfStrings(body.allowedFormats).filter((format) => format === "xml" || format === "json") as Array<"xml" | "json">),
    notes: body.notes?.trim() || "",
    createdAt: body.createdAt || now,
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
