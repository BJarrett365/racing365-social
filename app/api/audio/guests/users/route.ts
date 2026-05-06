import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import { readAuthData } from "@/app/lib/auth/store";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (auth.user.role === "meeting_guest") {
    return NextResponse.json({ error: "Meeting guests cannot browse registered users." }, { status: 403 });
  }

  const data = await readAuthData();
  const users = Object.values(data.users)
    .filter((user) => user.active && user.emailVerifiedAt)
    .map((user) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: user.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ users });
}
