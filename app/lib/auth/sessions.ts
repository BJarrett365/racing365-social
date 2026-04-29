import crypto from "crypto";
import type { PlexaSessionPayload } from "@/app/lib/auth/types";

export const SESSION_COOKIE = "plexa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sessionSecret(): string {
  const secret = process.env.PLEXA_SESSION_SECRET?.trim() || process.env.ADMIN_TOKEN?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Set PLEXA_SESSION_SECRET before hosting Plexa publicly.");
  }
  return secret || "plexa-local-dev-session-secret-change-before-hosting";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(input: Omit<PlexaSessionPayload, "exp">): string {
  const payload: PlexaSessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): PlexaSessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as PlexaSessionPayload;
    if (!payload.userId || !payload.email || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function clearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function sessionFromRequest(request: Request): PlexaSessionPayload | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return token ? verifySessionToken(decodeURIComponent(token)) : null;
}
