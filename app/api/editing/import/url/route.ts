import { NextResponse } from "next/server";
import { ArticleUrlImportService } from "@/features/editing-studio/services/article-url-import-service";
import { importUrlRequestSchema } from "@/features/editing-studio/validators/editing-studio-schemas";

/**
 * Editing Studio — import article from URL and create a project.
 * Isolated under /api/editing/* (not shared with other features).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = importUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        { status: 400 },
      );
    }
    const result = await new ArticleUrlImportService().importFromUrlAndCreate(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
