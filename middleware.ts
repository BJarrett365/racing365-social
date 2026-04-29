import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "plexa_session";
const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/verify-email",
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/verify-email",
  "/api/auth/logout",
  "/api/client-api",
  "/api/client-feeds",
  "/api/cron",
  "/api/health",
  "/api/webhooks",
  "/api/integrations/mux/webhook",
  "/_next",
  "/favicon.ico",
  "/brand",
];

function sessionSecret(): string {
  return process.env.PLEXA_SESSION_SECRET?.trim() || process.env.ADMIN_TOKEN?.trim() || "plexa-local-dev-session-secret-change-before-hosting";
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const bytes = Array.from(new Uint8Array(signature));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;
  if ((await hmac(body)) !== signature) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as { exp?: number; userId?: string };
    return Boolean(payload.userId && payload.exp && payload.exp > Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  if (await hasValidSession(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
