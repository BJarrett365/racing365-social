import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  restreamClientId?: string;
  restreamClientSecret?: string;
};

/** Dummy refresh token — Restream should reject grant but accept client Basic auth if id/secret are valid. */
const DUMMY_REFRESH = "plexa-admin-connectivity-check";

function readRestreamError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const err = o.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const m = (err as { message?: string }).message;
      if (typeof m === "string") return m;
      const name = (err as { name?: string }).name;
      if (typeof name === "string") return name;
    }
    if (typeof o.message === "string") return o.message;
  }
  return `Restream OAuth error (${status})`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const clientId = body.restreamClientId?.trim() || await getServerSecretAsync("RESTREAM_CLIENT_ID");
  const clientSecret = body.restreamClientSecret?.trim() || await getServerSecretAsync("RESTREAM_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Restream client id and secret required (RESTREAM_* env or admin form)." },
      { status: 400 },
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf-8").toString("base64");

  try {
    const res = await fetch("https://api.restream.io/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: DUMMY_REFRESH,
      }).toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.status === 401) {
      return NextResponse.json(
        { ok: false, error: readRestreamError(data, res.status) || "Invalid client id or secret (401)." },
        { status: 400 },
      );
    }

    const errMsg = readRestreamError(data, res.status).toLowerCase();
    const errStr = JSON.stringify(data).toLowerCase();
    const invalidClient = errStr.includes("invalid_client") || errMsg.includes("invalid_client");
    if (invalidClient) {
      return NextResponse.json(
        { ok: false, error: readRestreamError(data, res.status) || "Invalid Restream client id or secret." },
        { status: 400 },
      );
    }

    const invalidGrant =
      errStr.includes("invalid_grant") ||
      errMsg.includes("invalid_grant") ||
      errMsg.includes("invalid grant") ||
      errMsg.includes("refresh token");

    if (invalidGrant) {
      return NextResponse.json({
        ok: true,
        message:
          "Restream accepted client id and secret (OAuth token endpoint responded as expected for a dummy refresh).",
      });
    }

    if (res.ok && (data.access_token || data.accessToken)) {
      return NextResponse.json({
        ok: true,
        message: "Restream returned tokens (unexpected for dummy refresh — verify app configuration).",
      });
    }

    return NextResponse.json(
      { ok: false, error: readRestreamError(data, res.status) },
      { status: res.status >= 400 && res.status < 500 ? 400 : 502 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Restream request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
