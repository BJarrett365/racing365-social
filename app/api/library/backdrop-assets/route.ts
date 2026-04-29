import { NextResponse } from "next/server";
import { scanBackdropVideoRels } from "@/app/lib/scan-backdrop-videos";
import { scanLibraryBackgroundImageRels } from "@/app/lib/scan-library-background-images";

export async function GET() {
  try {
    const [backdropVideos, libraryBackgroundImages] = await Promise.all([
      scanBackdropVideoRels(),
      scanLibraryBackgroundImageRels(),
    ]);
    return NextResponse.json({ backdropVideos, libraryBackgroundImages });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
