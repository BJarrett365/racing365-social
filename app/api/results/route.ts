import { NextResponse } from "next/server";
import { getRacingDataProvider } from "@/app/features/data/providers";

export async function GET() {
  try {
    const items = await getRacingDataProvider().getFastResults();
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
