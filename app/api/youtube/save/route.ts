import { NextResponse } from "next/server";
import { deleteLanguageArticles } from "@/app/lib/language-studio/store";
import { createLanguageArticleFromYouTubeTranscript } from "@/app/lib/youtube-script/language-studio-bridge";
import { deleteYouTubeScriptImports, listYouTubeScriptImports, saveYouTubeScriptImport } from "@/app/lib/youtube-script/storage";
import type {
  TranscriptResult,
  YouTubeGeneratedOutput,
  YouTubeVideoMeta,
} from "@/app/lib/youtube-script/types";

export async function GET() {
  try {
    const imports = await listYouTubeScriptImports();
    return NextResponse.json({ imports });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      meta?: YouTubeVideoMeta;
      transcript?: TranscriptResult;
      outputs?: YouTubeGeneratedOutput[];
      createArticle?: boolean;
      articleOutputId?: string;
    };
    if (!body.meta?.videoId) return NextResponse.json({ error: "Video metadata is required." }, { status: 400 });
    if (!body.transcript?.fullText?.trim()) return NextResponse.json({ error: "Transcript is required." }, { status: 400 });

    const outputs = Array.isArray(body.outputs) ? body.outputs : [];
    const saved = await saveYouTubeScriptImport({
      id: body.id,
      sourceUrl: body.meta.url,
      meta: body.meta,
      transcript: body.transcript,
      outputs,
    });
    const articleOutput = body.articleOutputId
      ? outputs.find((output) => output.id === body.articleOutputId)
      : outputs.find((output) => output.type === "article");
    const summaryOutput = outputs.find((output) => output.type === "summary");
    const languageArticle = body.createArticle
      ? await createLanguageArticleFromYouTubeTranscript(body.meta, body.transcript, {
          output: articleOutput,
          summary: summaryOutput?.content,
        })
      : undefined;
    return NextResponse.json({ import: saved, languageArticle });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { importIds?: string[]; articleIds?: string[] };
    const importIds = Array.isArray(body.importIds) ? body.importIds : [];
    const articleIds = Array.isArray(body.articleIds) ? body.articleIds : [];
    const deletedImports = await deleteYouTubeScriptImports(importIds);
    const deletedArticles = articleIds.length ? await deleteLanguageArticles(articleIds) : { deletedIds: [], blockedIds: [] };
    return NextResponse.json({ success: true, deletedImports, deletedArticles });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
