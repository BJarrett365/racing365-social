import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getRestreamIngest } from "@/features/live-control/services/restream-service";

/** Restream ingest details (stream key + URLs). Sensitive — admin only. */
export async function GET(request: Request) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  try {
    const ingest = await getRestreamIngest();
    return NextResponse.json(ingest);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
