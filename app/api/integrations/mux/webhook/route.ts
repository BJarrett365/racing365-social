import { handleMuxWebhookPost } from "@/features/live-control/services/mux-webhook-handler";

export const dynamic = "force-dynamic";

/** Legacy path — identical to POST /api/webhooks/mux */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("mux-signature");
  return handleMuxWebhookPost(rawBody, sig);
}
