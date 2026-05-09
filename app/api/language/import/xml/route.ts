import { NextResponse } from "next/server";
import { importLanguageFeed } from "@/app/lib/language-studio/import-feed";
import type { LanguageCode, LanguageSourceParserType } from "@/app/lib/language-studio/types";

type Body = {
  sourceBrand?: string;
  sourceLanguage?: LanguageCode;
  sourceUrl?: string;
  xml?: string;
  processImages?: boolean;
  importFullArticles?: boolean;
  parserType?: LanguageSourceParserType;
  maxArticles?: number;
  incrementalAfter?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await importLanguageFeed({
      ...body,
      maxArticles: typeof body.maxArticles === "number" && body.maxArticles > 0 ? Math.min(500, Math.floor(body.maxArticles)) : undefined,
      incrementalAfter: typeof body.incrementalAfter === "string" && body.incrementalAfter.trim() ? body.incrementalAfter.trim() : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
