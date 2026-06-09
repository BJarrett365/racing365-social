import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/guards";
import { runReleaseCheck } from "@/app/lib/dev-gateway/release-check";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  input?: string;
};

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const input = body.input?.trim();
    if (!input) return NextResponse.json({ error: "Paste release material before running QA review." }, { status: 400 });
    const { result, model } = await runReleaseCheck(input);
    return NextResponse.json({ result, model });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Release check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
