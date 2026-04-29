import { NextResponse } from "next/server";
import { newLanguageId, readLanguageStudioData, sortDesc, upsertRule } from "@/app/lib/language-studio/store";
import type { LanguageRule } from "@/app/lib/language-studio/types";

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({ rules: sortDesc(Object.values(data.rules)) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<LanguageRule> | null;
  if (!body?.title?.trim() || !body.rule?.trim()) {
    return NextResponse.json({ error: "title and rule are required." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const row: LanguageRule = {
    id: body.id || newLanguageId("lrule"),
    brand: body.brand?.trim() || "Global",
    targetLanguage: body.targetLanguage ?? "",
    market: body.market?.trim() || "",
    fieldType: body.fieldType?.trim() || "",
    title: body.title.trim(),
    rule: body.rule.trim(),
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  await upsertRule(row);
  return NextResponse.json({ success: true, rule: row });
}
