import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/app/lib/auth/sessions";
import { readAuthData } from "@/app/lib/auth/store";
import type { PlexaUser } from "@/app/lib/auth/types";

export async function requireUser(request: Request): Promise<{ user: PlexaUser } | { response: NextResponse }> {
  const session = sessionFromRequest(request);
  if (!session) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const data = await readAuthData();
  const user = data.users[session.userId];
  if (!user?.active || !user.emailVerifiedAt) {
    return { response: NextResponse.json({ error: "User is not active or verified." }, { status: 403 }) };
  }
  return { user };
}

export async function requireAdmin(request: Request): Promise<{ user: PlexaUser } | { response: NextResponse }> {
  const result = await requireUser(request);
  if ("response" in result) return result;
  if (result.user.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return result;
}
