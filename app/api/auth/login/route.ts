import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/app/lib/auth/sessions";
import { normaliseEmail, verifyPassword } from "@/app/lib/auth/passwords";
import { readAuthData, writeAuthData } from "@/app/lib/auth/store";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const email = normaliseEmail(body.email ?? "");
  const password = body.password ?? "";
  const data = await readAuthData();
  const user = Object.values(data.users).find((row) => row.email === email);
  if (!user?.passwordHash || !user.passwordSalt) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  if (!user.active) return NextResponse.json({ error: "This user has been disabled." }, { status: 403 });
  if (!user.emailVerifiedAt) return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 });
  const ok = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = user.lastLoginAt;
  await writeAuthData(data);

  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...sessionCookieOptions(), value: createSessionToken({ userId: user.id, email: user.email, role: user.role }) });
  return response;
}
