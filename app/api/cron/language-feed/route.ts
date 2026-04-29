import { NextResponse } from "next/server";
import { DEFAULT_LANGUAGE_FEED_URL, importLanguageFeed } from "@/app/lib/language-studio/import-feed";

function isAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importLanguageFeed({
      sourceBrand: "PlanetF1",
      sourceLanguage: "en",
      sourceUrl: DEFAULT_LANGUAGE_FEED_URL,
      processImages: true,
      importFullArticles: true,
    });
    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      feedUrl: DEFAULT_LANGUAGE_FEED_URL,
      articles: result.articles.length,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      imageCount: result.imageCount,
      import: result.import,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
