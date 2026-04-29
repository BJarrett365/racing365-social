import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/app/lib/auth/sessions";
import { hashPassword, isStrongPassword, normaliseEmail } from "@/app/lib/auth/passwords";
import { hasAnyUsers, newAuthId, upsertUser } from "@/app/lib/auth/store";
import type { PlexaUser } from "@/app/lib/auth/types";

type Body = {
  name?: string;
  email?: string;
  password?: string;
  setupToken?: string;
};

function setupAllowed(inputToken?: string): boolean {
  const required = process.env.PLEXA_SETUP_TOKEN?.trim();
  if (required) return inputToken?.trim() === required;
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  return NextResponse.json({ hasUsers: await hasAnyUsers(), setupTokenRequired: Boolean(process.env.PLEXA_SETUP_TOKEN?.trim()) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  if (await hasAnyUsers()) return NextResponse.json({ error: "Setup has already been completed." }, { status: 409 });
  if (!setupAllowed(body.setupToken)) {
    return NextResponse.json({ error: "Setup token is required. Set PLEXA_SETUP_TOKEN and enter it here." }, { status: 401 });
  }

  const name = body.name?.trim() || "Plexa Admin";
  const email = normaliseEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 12 characters and include upper case, lower case and a number." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { hash, salt } = await hashPassword(password);
  const user: PlexaUser = {
    id: newAuthId("user"),
    name,
    email,
    role: "admin",
    active: true,
    passwordHash: hash,
    passwordSalt: salt,
    passwordSetAt: now,
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await upsertUser(user);

  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...sessionCookieOptions(), value: createSessionToken({ userId: user.id, email: user.email, role: user.role }) });
  return response;
}
