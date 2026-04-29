import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { cleanOrphanVideoFiles } from "@/app/lib/delete-build";

type Body = {
  adminToken?: string;
};

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  try {
    const deleted = await cleanOrphanVideoFiles();
    return NextResponse.json({ ok: true, deleted, deletedCount: deleted.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
