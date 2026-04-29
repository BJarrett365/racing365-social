import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeRestreamAuthorizationCode } from "@/features/live-control/services/restream-oauth";
import { restreamOAuthRedirectUrl } from "@/features/live-control/lib/app-public-base-url";

/**
 * Restream OAuth callback — exchanges code for tokens (server-side only).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  const base = new URL(request.url);
  const appOrigin = `${base.protocol}//${base.host}`;

  if (err) {
    return NextResponse.redirect(`${appOrigin}/live?restream_error=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appOrigin}/live?restream_error=missing_code_or_state`);
  }

  const jar = await cookies();
  const expected = jar.get("restream_oauth_state")?.value;
  if (!expected || expected !== state) {
    return NextResponse.redirect(`${appOrigin}/live?restream_error=invalid_state`);
  }

  try {
    await exchangeRestreamAuthorizationCode(code, restreamOAuthRedirectUrl());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    return NextResponse.redirect(`${appOrigin}/live?restream_error=${encodeURIComponent(msg)}`);
  }

  const res = NextResponse.redirect(`${appOrigin}/live?restream=connected`);
  res.cookies.set("restream_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
