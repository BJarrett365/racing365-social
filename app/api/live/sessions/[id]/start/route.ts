import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { readAdminTokenFromRequest } from "@/app/api/live/_lib/read-admin-token";
import { toPublicLiveSession } from "@/features/live-control/lib/sanitize-session";
import { startLiveSession } from "@/features/live-control/services/live-session-service";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let body: { adminToken?: string };
  try {
    body = (await request.json().catch(() => ({}))) as { adminToken?: string };
  } catch {
    body = {};
  }

  const denied = assertAdminWrite(request, readAdminTokenFromRequest(request, body.adminToken));
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const session = await startLiveSession(id);
    return NextResponse.json({ session: toPublicLiveSession(session) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Start failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
