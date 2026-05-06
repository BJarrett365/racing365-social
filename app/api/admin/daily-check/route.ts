import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  dailyApiKey?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const key = body.dailyApiKey?.trim() || await getServerSecretAsync("DAILY_API_KEY");
  if (!key) {
    return NextResponse.json({ error: "No Daily API key provided (or stored in admin settings)." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.daily.co/v1/rooms?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({})) as { total_count?: number; error?: string; info?: string };
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.info || data.error || `Daily API error (${res.status})` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Daily API key is valid.",
      roomCount: typeof data.total_count === "number" ? data.total_count : null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Daily request failed" },
      { status: 500 },
    );
  }
}
