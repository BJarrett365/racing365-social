import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { readAdminTokenFromRequest } from "@/app/api/live/_lib/read-admin-token";
import { createMuxLiveStream } from "@/features/live-control/services/mux-provider-service";
import { upsertMuxStreamFromLiveData } from "@/features/live-control/services/mux-stream-store";

export async function POST(request: Request) {
  let body: {
    adminToken?: string;
    playback_policy?: string[];
    reconnect_window?: number;
    latency_mode?: string;
  };
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, readAdminTokenFromRequest(request, body.adminToken));
  if (denied) return denied;

  try {
    const { data } = await createMuxLiveStream({
      playback_policy: body.playback_policy,
      reconnect_window: body.reconnect_window,
      latency_mode: body.latency_mode,
    });
    const record = upsertMuxStreamFromLiveData(data);
    return NextResponse.json({ record, live: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mux create failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
