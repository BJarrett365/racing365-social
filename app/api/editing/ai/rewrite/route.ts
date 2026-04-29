import { NextResponse } from "next/server";
import { runRewriteAi } from "@/features/editing-studio/services/editing-ai-actions";
import { editingAiRewriteRequestSchema } from "@/features/editing-studio/validators/editing-ai-schemas";

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = editingAiRewriteRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const d = parsed.data;
    const result = await runRewriteAi({
      intent: d.intent,
      sourceText: d.sourceText,
      brand: d.brand,
      title: d.title,
      summary: d.summary,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rewrite failed";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
