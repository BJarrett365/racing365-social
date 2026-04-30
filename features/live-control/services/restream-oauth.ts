import { getServerSecret } from "@/app/lib/server-secrets";
import type { RestreamStoredTokens } from "@/features/live-control/services/restream-token-store";
import { writeRestreamTokensAsync } from "@/features/live-control/services/restream-token-store";

const TOKEN_URL = "https://api.restream.io/oauth/token";

function basicAuthHeader(): string {
  const id = getServerSecret("RESTREAM_CLIENT_ID");
  const secret = getServerSecret("RESTREAM_CLIENT_SECRET");
  if (!id || !secret) {
    throw new Error("RESTREAM_CLIENT_ID and RESTREAM_CLIENT_SECRET must be configured.");
  }
  const basic = Buffer.from(`${id}:${secret}`, "utf8").toString("base64");
  return `Basic ${basic}`;
}

export async function exchangeRestreamAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<RestreamStoredTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Restream token exchange failed (${res.status}): ${JSON.stringify(data)}`);
  }
  const access =
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.accessToken === "string" && data.accessToken);
  const refresh =
    (typeof data.refresh_token === "string" && data.refresh_token) ||
    (typeof data.refreshToken === "string" && data.refreshToken);
  if (!access || !refresh) {
    throw new Error("Restream token exchange: missing access or refresh token");
  }
  const expiresIn =
    typeof data.expires_in === "number"
      ? data.expires_in
      : typeof data.accessTokenExpiresIn === "number"
        ? data.accessTokenExpiresIn
        : 3600;
  const now = Date.now();
  const row: RestreamStoredTokens = {
    accessToken: access,
    refreshToken: refresh,
    accessExpiresAtMs: now + Math.max(60, expiresIn - 120) * 1000,
    updatedAt: new Date().toISOString(),
  };
  await writeRestreamTokensAsync(row);
  return row;
}

export async function refreshRestreamAccessToken(refreshToken: string): Promise<RestreamStoredTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Restream refresh failed (${res.status}): ${JSON.stringify(data)}`);
  }
  const access =
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.accessToken === "string" && data.accessToken);
  const refresh =
    (typeof data.refresh_token === "string" && data.refresh_token) ||
    (typeof data.refreshToken === "string" && data.refreshToken);
  if (!access || !refresh) {
    throw new Error("Restream refresh: missing tokens");
  }
  const expiresIn =
    typeof data.expires_in === "number"
      ? data.expires_in
      : typeof data.accessTokenExpiresIn === "number"
        ? data.accessTokenExpiresIn
        : 3600;
  const now = Date.now();
  const row: RestreamStoredTokens = {
    accessToken: access,
    refreshToken: refresh,
    accessExpiresAtMs: now + Math.max(60, expiresIn - 120) * 1000,
    updatedAt: new Date().toISOString(),
  };
  await writeRestreamTokensAsync(row);
  return row;
}
