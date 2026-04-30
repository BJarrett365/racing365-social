import { NextResponse } from "next/server";
import { scanLibraryBackgroundImageRels } from "@/app/lib/scan-library-background-images";

export type LibraryImageItem = {
  relPath: string;
  label: string;
};

const MAX_ITEMS = 80;

export async function GET() {
  try {
    const items = (await scanLibraryBackgroundImageRels())
      .filter((relPath) => relPath.startsWith("images/library/"))
      .slice(0, MAX_ITEMS)
      .map((relPath) => ({
        relPath,
        label: relPath.split("/").slice(-2).join("/"),
      }));
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Library read failed";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
