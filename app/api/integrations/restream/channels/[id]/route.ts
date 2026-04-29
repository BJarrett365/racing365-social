import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { readAdminTokenFromRequest } from "@/app/api/live/_lib/read-admin-token";
import { setRestreamChannelState } from "@/features/live-control/services/restream-service";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let body: { adminToken?: string; active?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, readAdminTokenFromRequest(request, body.adminToken));
  if (denied) return denied;

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) required" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const channelId = parseInt(id, 10);
  if (Number.isNaN(channelId)) {
    return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
  }

  try {
    await setRestreamChannelState(channelId, body.active);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
