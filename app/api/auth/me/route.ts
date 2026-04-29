import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth/guards";
import { publicUser } from "@/app/lib/auth/store";

export async function GET(request: Request) {
  const result = await requireUser(request);
  if ("response" in result) return result.response;
  return NextResponse.json({ user: publicUser(result.user) });
}
