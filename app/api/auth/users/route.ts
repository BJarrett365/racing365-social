import { NextResponse } from "next/server";
import { createVerificationForUser, verificationUrl } from "@/app/lib/auth/invites";
import { requireAdmin } from "@/app/lib/auth/guards";
import { hashPassword, isStrongPassword, normaliseEmail } from "@/app/lib/auth/passwords";
import { newAuthId, readAuthData, sortedPublicUsers, writeAuthData } from "@/app/lib/auth/store";
import type { PlexaUser, PlexaUserRole } from "@/app/lib/auth/types";

type Body = {
  action?: "create" | "update" | "resend-verification" | "reset-password";
  id?: string;
  name?: string;
  email?: string;
  role?: PlexaUserRole;
  active?: boolean;
  password?: string;
};

function validRole(role: unknown): role is PlexaUserRole {
  return role === "admin"
    || role === "editor"
    || role === "viewer"
    || role === "meeting_guest"
    || role === "meeting_host"
    || role === "audio_user"
    || role === "audio_editor";
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const data = await readAuthData();
  return NextResponse.json({ users: sortedPublicUsers(data) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const data = await readAuthData();
  const now = new Date().toISOString();

  if (body.action === "create") {
    const email = normaliseEmail(body.email ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (Object.values(data.users).some((row) => row.email === email)) return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    const role = validRole(body.role) ? body.role : "editor";
    const draft: PlexaUser = {
      id: newAuthId("user"),
      name: body.name?.trim() || email,
      email,
      role,
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    };
    const invited = createVerificationForUser(draft);
    data.users[invited.user.id] = invited.user;
    await writeAuthData(data);
    return NextResponse.json({ success: true, users: sortedPublicUsers(data), verificationUrl: verificationUrl(invited.rawToken) });
  }

  const user = body.id ? data.users[body.id] : undefined;
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (body.action === "resend-verification") {
    const invited = createVerificationForUser(user);
    data.users[user.id] = invited.user;
    await writeAuthData(data);
    return NextResponse.json({ success: true, users: sortedPublicUsers(data), verificationUrl: verificationUrl(invited.rawToken) });
  }

  if (body.action === "reset-password") {
    if (!body.password || !isStrongPassword(body.password)) {
      return NextResponse.json({ error: "Password must be at least 12 characters and include upper case, lower case and a number." }, { status: 400 });
    }
    const { hash, salt } = await hashPassword(body.password);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.passwordSetAt = now;
    user.emailVerifiedAt = user.emailVerifiedAt ?? now;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
  } else {
    if (body.name !== undefined) user.name = body.name.trim() || user.name;
    if (validRole(body.role)) user.role = body.role;
    if (body.active !== undefined) user.active = body.active;
  }

  user.updatedAt = now;
  await writeAuthData(data);
  return NextResponse.json({ success: true, users: sortedPublicUsers(data) });
}
