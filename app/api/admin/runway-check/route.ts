import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecret } from "@/app/lib/server-secrets";

const RUNWAY_API_BASE = "https://api.dev.runwayml.com";
/** Required by Runway REST API; see https://docs.dev.runwayml.com */
const RUNWAY_VERSION = "2024-11-06";

type Body = {
  adminToken?: string;
  runwaymlApiKey?: string;
};

function readRunwayError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string") return o.error;
    const msg = o.message;
    if (typeof msg === "string") return msg;
    const detail = o.detail;
    if (typeof detail === "string") return detail;
  }
  return `Runway API error (${status})`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const key = body.runwaymlApiKey?.trim() || getServerSecret("RUNWAYML_API_SECRET");
  if (!key) {
    return NextResponse.json(
      { error: "No Runway API secret provided (set RUNWAYML_API_SECRET or store a key in admin settings)." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/v1/organization`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_VERSION,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: readRunwayError(data, res.status) },
        { status: 400 },
      );
    }

    const creditBalance = typeof data.creditBalance === "number" ? data.creditBalance : null;
    return NextResponse.json({
      ok: true,
      creditBalance,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Runway request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
