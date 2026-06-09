import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { testDeepSeekConnection } from "@/app/lib/ai/providers/deepseek-provider";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  deepseekApiKey?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const inlineKey = body.deepseekApiKey?.trim();
  if (inlineKey) {
    const prev = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = inlineKey;
    try {
      const result = await testDeepSeekConnection();
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    } finally {
      if (prev === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = prev;
    }
  }

  const stored = await getServerSecretAsync("DEEPSEEK_API_KEY");
  if (!stored) {
    return NextResponse.json(
      { error: "No DeepSeek API key provided (set DEEPSEEK_API_KEY or store a key in admin settings)." },
      { status: 400 },
    );
  }

  const result = await testDeepSeekConnection();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
