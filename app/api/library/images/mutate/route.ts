import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import {
  dedupeLibraryImages,
  deleteLibraryImageByRel,
  deleteLibraryImagesMany,
  validateLibraryImageRel,
} from "@/app/lib/library-image-delete";
import { scanLibraryBackgroundImageRels } from "@/app/lib/scan-library-background-images";

const MAX_BATCH = 2500;

type Body = {
  action?: string;
  /** Single-file delete */
  rel?: string;
  /** Bulk delete or duplicate scan scope */
  rels?: string[];
  adminToken?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const action = body.action?.trim();

  if (action === "deleteOne") {
    const rel = body.rel?.trim();
    if (!rel || !validateLibraryImageRel(rel)) {
      return NextResponse.json({ error: "Invalid or missing rel for library image." }, { status: 400 });
    }
    const ok = await deleteLibraryImageByRel(rel);
    if (!ok) {
      return NextResponse.json({ error: "Could not delete file (missing or not on disk)." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, action: "deleteOne", deleted: [rel] });
  }

  if (action === "deleteMany") {
    const rels = Array.isArray(body.rels) ? body.rels.map((r) => String(r).trim()).filter(Boolean) : [];
    if (rels.length === 0) {
      return NextResponse.json({ error: "Provide rels array." }, { status: 400 });
    }
    if (rels.length > MAX_BATCH) {
      return NextResponse.json({ error: `At most ${MAX_BATCH} paths per request.` }, { status: 400 });
    }
    const invalid = rels.filter((r) => !validateLibraryImageRel(r));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} path(s) are not allowed library image paths.` },
        { status: 400 },
      );
    }
    const deleted = await deleteLibraryImagesMany(rels);
    return NextResponse.json({ ok: true, action: "deleteMany", deleted, deletedCount: deleted.length });
  }

  if (action === "removeDuplicates") {
    let scope = Array.isArray(body.rels) ? body.rels.map((r) => String(r).trim()).filter(Boolean) : [];
    if (scope.length === 0) {
      scope = await scanLibraryBackgroundImageRels();
    }
    if (scope.length > MAX_BATCH) {
      return NextResponse.json({ error: `At most ${MAX_BATCH} paths for duplicate scan.` }, { status: 400 });
    }
    const invalid = scope.filter((r) => !validateLibraryImageRel(r));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} path(s) are not allowed library image paths.` },
        { status: 400 },
      );
    }
    const { deleted, duplicateGroups } = await dedupeLibraryImages(scope);
    return NextResponse.json({
      ok: true,
      action: "removeDuplicates",
      deleted,
      deletedCount: deleted.length,
      duplicateGroups,
    });
  }

  return NextResponse.json(
    { error: "Unknown action. Use deleteOne, deleteMany, or removeDuplicates." },
    { status: 400 },
  );
}
