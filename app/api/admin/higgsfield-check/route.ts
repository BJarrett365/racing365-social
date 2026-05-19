import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getHiggsfieldAuthorizationHeader } from "@/app/lib/higgsfield/client";

const PLATFORM_BASE = "https://platform.higgsfield.ai";

type Body = {
  adminToken?: string;
  higgsfieldApiKey?: string;
  higgsfieldApiSecret?: string;
};

/** Validates credentials without starting a billable generation job. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const auth = await getHiggsfieldAuthorizationHeader({
    apiKey: body.higgsfieldApiKey,
    apiSecret: body.higgsfieldApiSecret,
  });
  if (!auth) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No Higgsfield credentials (set HF_CREDENTIALS or HF_API_KEY + HF_API_SECRET, or save keys in Admin).",
      },
      { status: 400 },
    );
  }

  try {
    const probeUrl = `${PLATFORM_BASE}/requests/f47ac10b-58cc-4372-a567-0e02b2c3d479/status`;
    const res = await fetch(probeUrl, {
      method: "GET",
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { ok: false, error: "Higgsfield rejected these credentials (401/403)." },
        { status: 400 },
      );
    }

    /**
     * Probe uses a random UUID that is never a real job. Valid credentials still reach the API;
     * “job not found” is usually 404 — that means auth succeeded without starting a billable run.
     */
    if (res.status === 404) {
      return NextResponse.json({
        ok: true,
        detail:
          "Success: credentials are valid. Higgsfield returned 404 because we asked for a non-existent job id on purpose (no credits used).",
      });
    }

    if (res.ok) {
      return NextResponse.json({
        ok: true,
        detail: "Success: credentials are valid.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: `Unexpected HTTP ${res.status} from Higgsfield. Expected 404 for a dummy job id when credentials are valid.`,
      },
      { status: 400 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Higgsfield request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
