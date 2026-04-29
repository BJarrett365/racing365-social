import { NextResponse } from "next/server";
import { OpenAiScriptService } from "@/lib/podcast-template/openai-script-service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      importedText?: string;
      prompt?: string;
      model?: string;
      speakers?: Array<{ name?: string; role?: string }>;
    };
    const importedText = String(body.importedText ?? "").trim();
    const prompt = String(body.prompt ?? "").trim();
    if (!importedText) return NextResponse.json({ error: "Imported text is required" }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: "Conversion prompt is required" }, { status: 400 });
    const script = await new OpenAiScriptService().convertArticleToScript({
      title: typeof body.title === "string" ? body.title : "",
      importedText,
      prompt,
      model: typeof body.model === "string" ? body.model : undefined,
      speakers: Array.isArray(body.speakers)
        ? body.speakers.map((s) => ({
            name: String(s?.name ?? "").trim(),
            role: String(s?.role ?? "").trim(),
          }))
        : [],
    });
    return NextResponse.json({ script });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Conversion failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
