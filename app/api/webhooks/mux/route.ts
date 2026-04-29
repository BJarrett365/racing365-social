import { handleMuxWebhookPost } from "@/features/live-control/services/mux-webhook-handler";

export const dynamic = "force-dynamic";

/** Mux webhook — configure in Mux dashboard; use MUX_WEBHOOK_SIGNING_SECRET in production. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("mux-signature");
  return handleMuxWebhookPost(rawBody, sig);
}
