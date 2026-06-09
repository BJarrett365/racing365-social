import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/guards";
import { saveDevGatewayRdEvidence } from "@/app/lib/dev-gateway/store";

export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  content?: string;
  mode?: string;
  linkedFiles?: string[];
};

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const content = body.content?.trim();
    if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });
    const evidence = await saveDevGatewayRdEvidence({
      title: body.title,
      content,
      mode: body.mode ?? "ask_openai",
      createdBy: auth.user.email,
      linkedFiles: body.linkedFiles ?? [],
    });
    return NextResponse.json({ evidence });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save R&D evidence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
