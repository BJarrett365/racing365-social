import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/guards";
import { normalizeReleaseCheckResult, type ReleaseCheckResult } from "@/app/lib/dev-gateway/release-check";
import { saveReleaseCheckRecord } from "@/app/lib/dev-gateway/store";

export const dynamic = "force-dynamic";

type Body = {
  type?: "release_note" | "qa_finding";
  title?: string;
  input?: string;
  result?: ReleaseCheckResult;
};

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    if (body.type !== "release_note" && body.type !== "qa_finding") {
      return NextResponse.json({ error: "type must be release_note or qa_finding." }, { status: 400 });
    }
    if (!body.result) return NextResponse.json({ error: "result is required." }, { status: 400 });
    const record = await saveReleaseCheckRecord({
      type: body.type,
      title: body.title,
      input: body.input ?? "",
      result: normalizeReleaseCheckResult(body.result),
    });
    return NextResponse.json({ record });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save release check.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
