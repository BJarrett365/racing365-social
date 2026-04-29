import { NextResponse } from "next/server";

/** Minimal JSON probe — no DB, fonts, or data files. Use when debugging “nothing loads”. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "racing365-social" });
}
