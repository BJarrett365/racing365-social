import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { sessionFromRequest } from "@/app/lib/auth/sessions";

/** Any signed-in Plexa user, or admin token (for scripts). */
export function assertRssBuilderAccess(req: Request, bodyToken?: string): NextResponse | null {
  if (sessionFromRequest(req)) return null;
  return assertAdminWrite(req, bodyToken);
}
