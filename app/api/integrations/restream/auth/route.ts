import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { RESTREAM_OAUTH_SCOPES } from "@/features/live-control/lib/constants";
import { restreamOAuthRedirectUrl } from "@/features/live-control/lib/app-public-base-url";
import crypto from "crypto";

/**
 * Start Restream OAuth. Requires admin token (header). Redirects to Restream login.
 * Client should call with fetch(..., { redirect: "manual" }) then follow Location.
 */
export async function GET(request: Request) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  const clientId = await getServerSecretAsync("RESTREAM_CLIENT_ID");
  if (!clientId) {
    return NextResponse.json({ error: "RESTREAM_CLIENT_ID is not configured." }, { status: 400 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const redirectUri = restreamOAuthRedirectUrl();
  const url = new URL("https://api.restream.io/login");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", RESTREAM_OAUTH_SCOPES);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString(), 302);
  res.cookies.set("restream_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
