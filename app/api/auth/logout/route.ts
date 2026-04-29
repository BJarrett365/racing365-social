import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/app/lib/auth/sessions";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...clearSessionCookieOptions(), value: "" });
  return response;
}
