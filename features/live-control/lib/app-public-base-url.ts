/**
 * Public base URL for OAuth redirects and webhooks (no trailing slash).
 */
export function getPublicAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    const u = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return u.replace(/\/$/, "");
  }
  return "http://localhost:8081";
}

export function restreamOAuthRedirectPath(): string {
  return "/api/integrations/restream/callback";
}

export function restreamOAuthRedirectUrl(): string {
  return `${getPublicAppBaseUrl()}${restreamOAuthRedirectPath()}`;
}
