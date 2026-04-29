import { NextResponse } from "next/server";
import { newLanguageId, readLanguageStudioData, sortDesc, upsertKnowledgeFile } from "@/app/lib/language-studio/store";
import type { LanguageKnowledgeFile } from "@/app/lib/language-studio/types";

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({ knowledgeFiles: sortDesc(Object.values(data.knowledgeFiles)) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<LanguageKnowledgeFile> | null;
  if (!body?.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "title and content are required." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const row: LanguageKnowledgeFile = {
    id: body.id || newLanguageId("lknow"),
    title: body.title.trim(),
    kind: body.kind || "prompt",
    language: body.language ?? "",
    content: body.content.trim(),
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  await upsertKnowledgeFile(row);
  return NextResponse.json({ success: true, knowledgeFile: row });
}
