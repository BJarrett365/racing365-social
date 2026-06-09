import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { testDeepSeekConnection, testOpenAiConnection } from "@/app/lib/ai";

type Body = {
  adminToken?: string;
  provider?: "openai" | "deepseek";
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

  const provider = body.provider ?? "deepseek";
  if (provider === "openai") {
    const result = await testOpenAiConnection();
    return NextResponse.json({ provider: "openai", ...result });
  }

  const result = await testDeepSeekConnection();
  return NextResponse.json({ provider: "deepseek", ...result });
}
