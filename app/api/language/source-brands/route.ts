import { NextResponse } from "next/server";
import {
  deleteSourceBrand,
  newLanguageId,
  readLanguageStudioData,
  sortDesc,
  upsertSourceBrand,
} from "@/app/lib/language-studio/store";
import type { LanguageCode, LanguageSourceBrand, LanguageSourceParserType, LanguageSportContext } from "@/app/lib/language-studio/types";
import { LANGUAGE_SPORT_CONTEXTS } from "@/app/lib/language-studio/types";

type Body = Partial<LanguageSourceBrand>;

const PARSER_TYPES: LanguageSourceParserType[] = ["rss-default", "wordpress-rss", "json-api", "xml", "html-page", "custom"];

function parserType(value: unknown): LanguageSourceParserType {
  return typeof value === "string" && PARSER_TYPES.includes(value as LanguageSourceParserType)
    ? (value as LanguageSourceParserType)
    : "rss-default";
}

function sportContext(value: unknown): LanguageSportContext | undefined {
  return typeof value === "string" && LANGUAGE_SPORT_CONTEXTS.includes(value as LanguageSportContext) ? (value as LanguageSportContext) : undefined;
}

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({ sourceBrands: sortDesc(Object.values(data.sourceBrands)) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.name?.trim()) return NextResponse.json({ error: "Source brand name is required." }, { status: 400 });
  if (!body.feedUrl?.trim()) return NextResponse.json({ error: "Feed URL is required." }, { status: 400 });
  const data = await readLanguageStudioData();
  const existing = body.id?.trim() ? data.sourceBrands[body.id.trim()] : undefined;
  const now = new Date().toISOString();
  const row: LanguageSourceBrand = {
    id: body.id || newLanguageId("lsource"),
    name: body.name.trim(),
    feedUrl: body.feedUrl.trim(),
    sourceLanguage: body.sourceLanguage || ("en" as LanguageCode),
    parserType: parserType(body.parserType),
    active: body.active ?? true,
    notes: body.notes?.trim() || "",
    defaultSport: Object.prototype.hasOwnProperty.call(body, "defaultSport")
      ? (body.defaultSport == null || String(body.defaultSport).trim() === ""
        ? undefined
        : sportContext(body.defaultSport))
      : existing?.defaultSport,
    createdAt: body.createdAt || existing?.createdAt || now,
    updatedAt: now,
  };
  await upsertSourceBrand(row);
  return NextResponse.json({ success: true, sourceBrand: row });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const ok = await deleteSourceBrand(id);
  if (!ok) return NextResponse.json({ error: "Source brand not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
