import { NextResponse } from "next/server";
import { runSummariseAi } from "@/features/editing-studio/services/editing-ai-actions";
import { editingAiSummariseRequestSchema } from "@/features/editing-studio/validators/editing-ai-schemas";

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = editingAiSummariseRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const d = parsed.data;
    const result = await runSummariseAi({
      sourceText: d.sourceText,
      brand: d.brand,
      title: d.title,
      summary: d.summary,
      mode: d.mode ?? "key_points",
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Summarise request failed";
    const status = message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
