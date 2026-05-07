import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { runDueLanguageCronJobs } from "@/app/lib/language-studio/cron-runner";

function isLocalRequest(req: Request): boolean {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:");
}

function assertCronAccess(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.get("authorization")?.trim();
    const header = req.headers.get("x-cron-secret")?.trim();
    if (auth === `Bearer ${cronSecret}` || header === cronSecret) return null;
    return NextResponse.json({ error: "Invalid or missing cron secret." }, { status: 401 });
  }
  const denied = assertAdminWrite(req);
  if (!denied) return null;
  if (isLocalRequest(req) && denied.status === 503) return null;
  return denied;
}

export async function GET(req: Request) {
  const denied = assertCronAccess(req);
  if (denied) return denied;
  const runs = await runDueLanguageCronJobs();
  return NextResponse.json({
    success: true,
    ran: runs.length,
    runs,
  });
}

export async function POST(req: Request) {
  return GET(req);
}
