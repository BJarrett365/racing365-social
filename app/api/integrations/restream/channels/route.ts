import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getRestreamChannels } from "@/features/live-control/services/restream-service";

export async function GET(request: Request) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  try {
    const channels = await getRestreamChannels();
    return NextResponse.json({ channels });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Channels failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
