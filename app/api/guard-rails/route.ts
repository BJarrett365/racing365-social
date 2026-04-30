import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { mergeGuardRailsAsync, readGuardRailsAsync, type GuardRailFormat } from "@/app/lib/guard-rails-store";

type Body = {
  adminToken?: string;
  rails?: Partial<Record<GuardRailFormat, string>>;
};

export async function GET() {
  const data = await readGuardRailsAsync();
  return NextResponse.json({
    ...data,
    adminTokenRequired: Boolean(process.env.ADMIN_TOKEN?.trim()),
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  if (!body.rails || typeof body.rails !== "object") {
    return NextResponse.json({ error: "Missing rails payload." }, { status: 400 });
  }

  const saved = await mergeGuardRailsAsync(body.rails);
  return NextResponse.json({ ok: true, ...saved });
}
