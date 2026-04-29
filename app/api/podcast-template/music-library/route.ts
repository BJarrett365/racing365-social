import { NextResponse } from "next/server";
import { scanMusicAssetRels } from "@/app/lib/scan-music-assets";

export async function GET() {
  try {
    const music = await scanMusicAssetRels();
    return NextResponse.json({ music });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load music library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
