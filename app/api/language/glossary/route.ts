import { NextResponse } from "next/server";
import { newLanguageId, readLanguageStudioData, sortDesc, upsertGlossary } from "@/app/lib/language-studio/store";
import type { LanguageGlossaryEntry } from "@/app/lib/language-studio/types";

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({ glossary: sortDesc(Object.values(data.glossary)) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<LanguageGlossaryEntry> | null;
  if (!body?.sourceTerm?.trim()) return NextResponse.json({ error: "sourceTerm is required." }, { status: 400 });
  const now = new Date().toISOString();
  const row: LanguageGlossaryEntry = {
    id: body.id || newLanguageId("lgloss"),
    brand: body.brand?.trim() || "Global",
    sourceTerm: body.sourceTerm.trim(),
    targetLanguage: body.targetLanguage ?? "",
    targetTerm: body.targetTerm?.trim() || "",
    protected: Boolean(body.protected),
    notes: body.notes?.trim() || "",
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  await upsertGlossary(row);
  return NextResponse.json({ success: true, entry: row });
}
