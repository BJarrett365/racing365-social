import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/app/lib/auth/sessions";

/** Returns NextResponse error if write is not allowed; otherwise null */
export function assertAdminWrite(request: Request, bodyToken?: string): NextResponse | null {
  const session = sessionFromRequest(request);
  if (session?.role === "admin") return null;
  const required = process.env.ADMIN_TOKEN?.trim();
  if (process.env.NODE_ENV === "production" && !required) {
    return NextResponse.json(
      { error: "Set ADMIN_TOKEN in the server environment for destructive actions in production." },
      { status: 503 },
    );
  }
  if (!required) {
    return null;
  }
  const header = request.headers.get("x-admin-token")?.trim();
  const token = header || bodyToken?.trim();
  if (!token || token !== required) {
    return NextResponse.json({ error: "Invalid or missing admin token." }, { status: 401 });
  }
  return null;
}
