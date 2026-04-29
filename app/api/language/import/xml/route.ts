import { NextResponse } from "next/server";
import { importLanguageFeed } from "@/app/lib/language-studio/import-feed";
import type { LanguageCode } from "@/app/lib/language-studio/types";

type Body = {
  sourceBrand?: string;
  sourceLanguage?: LanguageCode;
  sourceUrl?: string;
  xml?: string;
  processImages?: boolean;
  importFullArticles?: boolean;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await importLanguageFeed(body);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
