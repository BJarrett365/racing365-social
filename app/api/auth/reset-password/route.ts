import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/app/lib/auth/sessions";
import { hashPassword, hashToken, isStrongPassword } from "@/app/lib/auth/passwords";
import { readAuthData, writeAuthData } from "@/app/lib/auth/store";

type Body = {
  token?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";
  if (!token) return NextResponse.json({ error: "Reset token is missing." }, { status: 400 });
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 12 characters and include upper case, lower case and a number." }, { status: 400 });
  }

  const data = await readAuthData();
  const tokenHash = hashToken(token);
  const user = Object.values(data.users).find((row) => row.passwordResetTokenHash === tokenHash);
  if (!user?.passwordResetExpiresAt || Date.parse(user.passwordResetExpiresAt) < Date.now()) {
    return NextResponse.json({ error: "Reset link is invalid or has expired. Request a new one from the login page." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { hash, salt } = await hashPassword(password);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.passwordSetAt = now;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.emailVerifiedAt = user.emailVerifiedAt ?? now;
  user.updatedAt = now;
  await writeAuthData(data);

  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...sessionCookieOptions(), value: createSessionToken({ userId: user.id, email: user.email, role: user.role }) });
  return response;
}
