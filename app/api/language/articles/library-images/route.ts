import { NextResponse } from "next/server";
import { scanLibraryBackgroundImageRels } from "@/app/lib/scan-library-background-images";

export type LanguageStudioLibraryImageItem = {
  relPath: string;
  label: string;
};

const MAX_ITEMS = 500;

function isAttachableLibraryRel(rel: string): boolean {
  const n = rel.trim().replace(/\\/g, "/");
  return n.startsWith("images/library/") || n.startsWith("library/");
}

export async function GET() {
  try {
    const all = await scanLibraryBackgroundImageRels();
    const items: LanguageStudioLibraryImageItem[] = all
      .filter(isAttachableLibraryRel)
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
