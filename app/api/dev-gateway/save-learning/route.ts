import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/guards";
import { upsertEditorialLearningProposal } from "@/app/lib/editorial-brain/store";
import { saveDevGatewayDevNote } from "@/app/lib/dev-gateway/store";

export const dynamic = "force-dynamic";

type Body = {
  saveAs?: "dev_note" | "knowledge" | "prompt_rule" | "creator_profile";
  title?: string;
  content?: string;
  mode?: string;
  linkedFiles?: string[];
  confidence?: number;
};

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const title = body.title?.trim() || "Dev Gateway learning";
    const content = body.content?.trim();
    if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });

    if (body.saveAs === "dev_note") {
      const note = await saveDevGatewayDevNote({
        title,
        content,
        mode: body.mode ?? "ask_openai",
        createdBy: auth.user.email,
        linkedFiles: body.linkedFiles ?? [],
      });
      return NextResponse.json({ note });
    }

    const type = body.saveAs === "prompt_rule" ? "prompt" : body.saveAs === "creator_profile" ? "creator" : "knowledge";
    const proposal = await upsertEditorialLearningProposal({
      type,
      title,
      summary: `Dev Gateway ${body.saveAs ?? "knowledge"} proposal`,
      confidence: Math.min(100, Math.max(0, Math.round(Number(body.confidence ?? 75)))),
      evidence: ["Saved from Plexa Dev Gateway by admin.", `Mode: ${body.mode ?? "unknown"}`],
      before: "No approved live change has been made.",
      after: content,
      impact: "Potential reusable learning after editor approval.",
      approvalRequired: true,
      proposedChanges: { content },
      targetEntityType: body.saveAs === "prompt_rule" ? "promptRule" : body.saveAs === "creator_profile" ? "journalistProfile" : "knowledgeFile",
      status: "pending",
    });
    return NextResponse.json({ proposal });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save Dev Gateway learning.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
