import crypto from "crypto";
import { getServerSecret } from "@/app/lib/server-secrets";

const TOLERANCE_SEC = 300;

/**
 * Verify Mux-Signature header (t=..., v1=...). Raw body must be the exact bytes Mux signed.
 */
export function verifyMuxWebhookSignature(rawBody: string, muxSignatureHeader: string | null): boolean {
  const secret = getServerSecret("MUX_WEBHOOK_SIGNING_SECRET");
  if (!secret || !muxSignatureHeader) {
    return false;
  }
  let t: string | null = null;
  let v1: string | null = null;
  for (const part of muxSignatureHeader.split(",")) {
    const [k, ...rest] = part.trim().split("=");
    const v = rest.join("=");
    if (k === "t") t = v;
    if (k === "v1") v1 = v;
  }
  if (!t || !v1) return false;
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(t, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > TOLERANCE_SEC) {
    return false;
  }
  const payload = `${t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function muxWebhookSecretConfigured(): boolean {
  return Boolean(getServerSecret("MUX_WEBHOOK_SIGNING_SECRET")?.trim());
}
