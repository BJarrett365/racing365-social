import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecret } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  muxTokenId?: string;
  muxTokenSecret?: string;
};

/** Strip accidental wrapping quotes from pasted .env values. */
function sanitizeMuxCredential(raw: string): string {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Mux returns shapes like `{ error: { type, messages: ["..."] } }` — not always `message`.
 */
function readMuxError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const err = o.error;
    if (err && typeof err === "object") {
      const e = err as { message?: string; messages?: unknown; type?: string };
      if (Array.isArray(e.messages) && e.messages.length > 0) {
        const parts = e.messages.filter((m): m is string => typeof m === "string");
        if (parts.length > 0) return parts.join(" ");
      }
      if (typeof e.message === "string") return e.message;
      if (typeof e.type === "string") return e.type;
    }
    if (typeof o.message === "string") return o.message;
  }
  return `Mux API error (${status})`;
}

const MUX_401_HINT =
  "Use the Access Token ID + Secret from Mux Dashboard → Settings → Access Tokens (Video read/write). Dev and production tokens are not interchangeable. Ensure ID is the username and Secret is the password — not a Signing Key.";

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const rawId = body.muxTokenId?.trim() || getServerSecret("MUX_TOKEN_ID");
  const rawSecret = body.muxTokenSecret?.trim() || getServerSecret("MUX_TOKEN_SECRET");
  const tokenId = rawId ? sanitizeMuxCredential(rawId) : "";
  const tokenSecret = rawSecret ? sanitizeMuxCredential(rawSecret) : "";
  if (!tokenId || !tokenSecret) {
    return NextResponse.json(
      { error: "Mux token id and secret required (MUX_TOKEN_ID / MUX_TOKEN_SECRET or admin form)." },
      { status: 400 },
    );
  }

  const basic = Buffer.from(`${tokenId}:${tokenSecret}`, "utf8").toString("base64");

  try {
    const res = await fetch("https://api.mux.com/video/v1/assets?page=1&limit=1", {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const detail = readMuxError(data, res.status);
      const withHint =
        res.status === 401 || res.status === 403
          ? `${detail}${detail.endsWith(".") ? "" : "."} ${MUX_401_HINT}`
          : detail;
      return NextResponse.json(
        { ok: false, error: withHint },
        { status: res.status === 401 || res.status === 403 ? 400 : 502 },
      );
    }

    const dataArr = data.data;
    const count = Array.isArray(dataArr) ? dataArr.length : 0;
    return NextResponse.json({
      ok: true,
      message: `Mux API accepted credentials (sample list: ${count} asset(s) in first page).`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mux request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
