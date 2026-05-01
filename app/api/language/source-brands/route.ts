import { NextResponse } from "next/server";
import {
  newLanguageId,
  readLanguageStudioData,
  sortDesc,
  upsertSourceBrand,
} from "@/app/lib/language-studio/store";
import type { LanguageCode, LanguageSourceBrand, LanguageSourceParserType } from "@/app/lib/language-studio/types";

type Body = Partial<LanguageSourceBrand>;

const PARSER_TYPES: LanguageSourceParserType[] = ["rss-default", "wordpress-rss", "json-api", "html-page", "custom"];

function parserType(value: unknown): LanguageSourceParserType {
  return typeof value === "string" && PARSER_TYPES.includes(value as LanguageSourceParserType)
    ? (value as LanguageSourceParserType)
    : "rss-default";
}

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({ sourceBrands: sortDesc(Object.values(data.sourceBrands)) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.name?.trim()) return NextResponse.json({ error: "Source brand name is required." }, { status: 400 });
  if (!body.feedUrl?.trim()) return NextResponse.json({ error: "Feed URL is required." }, { status: 400 });
  const now = new Date().toISOString();
  const row: LanguageSourceBrand = {
    id: body.id || newLanguageId("lsource"),
    name: body.name.trim(),
    feedUrl: body.feedUrl.trim(),
    sourceLanguage: body.sourceLanguage || ("en" as LanguageCode),
    parserType: parserType(body.parserType),
    active: body.active ?? true,
    notes: body.notes?.trim() || "",
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  await upsertSourceBrand(row);
  return NextResponse.json({ success: true, sourceBrand: row });
}
