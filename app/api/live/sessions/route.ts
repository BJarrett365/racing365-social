import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { readAdminTokenFromRequest } from "@/app/api/live/_lib/read-admin-token";
import { toPublicLiveSession } from "@/features/live-control/lib/sanitize-session";
import {
  createLiveSession,
  listLiveSessions,
} from "@/features/live-control/services/live-session-service";
import type { LiveSessionProvider, PlexaLiveSession } from "@/features/live-control/types/live-session";

function isProvider(v: unknown): v is LiveSessionProvider {
  return v === "mux" || v === "restream" || v === "mux_restream";
}

export async function GET(request: Request) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;
  const sessions = (await listLiveSessions()).map(toPublicLiveSession);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  let body: {
    adminToken?: string;
    title?: string;
    description?: string;
    brand?: string;
    provider?: unknown;
    metadata?: PlexaLiveSession["metadata"];
    restreamChannelIds?: number[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, readAdminTokenFromRequest(request, body.adminToken));
  if (denied) return denied;

  if (!isProvider(body.provider)) {
    return NextResponse.json({ error: "provider must be mux, restream, or mux_restream" }, { status: 400 });
  }

  const session = await createLiveSession({
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : undefined,
    brand: typeof body.brand === "string" ? body.brand : undefined,
    provider: body.provider,
    metadata: body.metadata,
    restreamChannelIds: Array.isArray(body.restreamChannelIds)
      ? body.restreamChannelIds.filter((n): n is number => typeof n === "number")
      : undefined,
  });

  return NextResponse.json({ session: toPublicLiveSession(session) });
}
