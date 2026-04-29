import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { listTargets } from "@/features/live-control/services/live-session-service";

/** Provider-agnostic targets (e.g. Restream channels). */
export async function GET(request: Request) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  try {
    const targets = await listTargets();
    return NextResponse.json(targets);
  } catch (e) {
    const message = e instanceof Error ? e.message : "listTargets failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
