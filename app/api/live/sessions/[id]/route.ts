import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { readAdminTokenFromRequest } from "@/app/api/live/_lib/read-admin-token";
import {
  toPublicLiveSession,
  toPublicLiveSessionWithSecrets,
} from "@/features/live-control/lib/sanitize-session";
import {
  getLiveSession,
  getPlaybackInfo,
  updateLiveSession,
} from "@/features/live-control/services/live-session-service";
import type { LiveStreamMetadata } from "@/features/live-control/types/live-session";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const includeSecrets = searchParams.get("includeSecrets") === "1";

  const session = getLiveSession(id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const playback = await getPlaybackInfo(id);

  if (includeSecrets) {
    return NextResponse.json({
      session: toPublicLiveSessionWithSecrets(session),
      playback,
    });
  }

  return NextResponse.json({
    session: toPublicLiveSession(session),
    playback,
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let body: {
    adminToken?: string;
    title?: string;
    description?: string;
    brand?: string;
    metadata?: LiveStreamMetadata;
    restreamChannelIds?: number[];
    provider?: "mux" | "restream" | "mux_restream";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, readAdminTokenFromRequest(request, body.adminToken));
  if (denied) return denied;

  const { id } = await ctx.params;

  try {
    const updated = updateLiveSession(id, {
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(body.brand !== undefined ? { brand: String(body.brand) } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
      ...(body.restreamChannelIds !== undefined ? { restreamChannelIds: body.restreamChannelIds } : {}),
      ...(body.provider !== undefined ? { provider: body.provider } : {}),
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ session: toPublicLiveSession(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
