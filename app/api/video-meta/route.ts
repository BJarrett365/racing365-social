import { NextResponse } from "next/server";
import { probeVideoRelDurationSec } from "@/app/features/video/edit-video";

export async function GET(req: Request) {
  const rel = new URL(req.url).searchParams.get("rel");
  if (!rel?.trim()) {
    return NextResponse.json({ error: "rel required" }, { status: 400 });
  }
  try {
    const durationSec = await probeVideoRelDurationSec(rel.trim());
    return NextResponse.json({ durationSec });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Probe failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
