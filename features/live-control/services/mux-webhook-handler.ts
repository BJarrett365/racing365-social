import { NextResponse } from "next/server";
import { muxWebhookSecretConfigured, verifyMuxWebhookSignature } from "@/features/live-control/lib/mux-webhook-verify";
import { patchMuxStreamRecordFromWebhook } from "@/features/live-control/services/mux-stream-store";
import { applyMuxLiveStreamWebhook } from "@/features/live-control/services/live-session-service";

type MuxWebhookEvent = {
  type?: string;
  data?: { id?: string; status?: string; active_asset_id?: string | null };
};

/**
 * Shared Mux webhook processing: verify signature, update stored provider stream + Plexa sessions.
 */
export function handleMuxWebhookPost(rawBody: string, muxSignatureHeader: string | null): NextResponse {
  if (muxWebhookSecretConfigured()) {
    if (!verifyMuxWebhookSignature(rawBody, muxSignatureHeader)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Set MUX_WEBHOOK_SIGNING_SECRET to verify Mux webhooks in production." },
      { status: 503 },
    );
  }

  let event: MuxWebhookEvent;
  try {
    event = JSON.parse(rawBody) as MuxWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event.type ?? "";
  if (!type.startsWith("video.live_stream")) {
    return NextResponse.json({ received: true });
  }

  const muxId = event.data?.id;
  if (!muxId) {
    return NextResponse.json({ received: true });
  }

  const status = event.data?.status;
  patchMuxStreamRecordFromWebhook(muxId, { status });

  applyMuxLiveStreamWebhook(muxId, type, {
    status,
    active_asset_id: event.data?.active_asset_id,
  });

  return NextResponse.json({ received: true });
}
