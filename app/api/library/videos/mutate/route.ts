import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { dedupeLibraryVideos, deleteLibraryVideoByRel, validateLibraryVideoRel } from "@/app/lib/library-video-delete";
import { scanLibraryVideoRels } from "@/app/lib/scan-library-videos";

const MAX_BATCH = 2500;

type Body = {
  action?: string;
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

  if (action === "deleteMany") {
    const rels = Array.isArray(body.rels) ? body.rels.map((r) => String(r).trim()).filter(Boolean) : [];
    if (rels.length === 0) {
      return NextResponse.json({ error: "Provide rels array." }, { status: 400 });
    }
    if (rels.length > MAX_BATCH) {
      return NextResponse.json({ error: `At most ${MAX_BATCH} paths per request.` }, { status: 400 });
    }
    const invalid = rels.filter((r) => !validateLibraryVideoRel(r));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} path(s) are not allowed library video paths.` },
        { status: 400 },
      );
    }
    const deleted: string[] = [];
    for (const rel of [...new Set(rels)]) {
      if (await deleteLibraryVideoByRel(rel)) deleted.push(rel);
    }
    return NextResponse.json({
      ok: true,
      action: "deleteMany",
      deleted,
      deletedCount: deleted.length,
    });
  }

  if (action === "removeDuplicates") {
    let scope = Array.isArray(body.rels) ? body.rels.map((r) => String(r).trim()).filter(Boolean) : [];
    if (scope.length === 0) {
      scope = await scanLibraryVideoRels();
    }
    if (scope.length > MAX_BATCH) {
      return NextResponse.json({ error: `At most ${MAX_BATCH} paths for duplicate scan.` }, { status: 400 });
    }
    const invalid = scope.filter((r) => !validateLibraryVideoRel(r));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `${invalid.length} path(s) are not allowed library video paths.` },
        { status: 400 },
      );
    }
    const { deleted, duplicateGroups } = await dedupeLibraryVideos(scope);
    return NextResponse.json({
      ok: true,
      action: "removeDuplicates",
      deleted,
      deletedCount: deleted.length,
      duplicateGroups,
    });
  }

  return NextResponse.json({ error: "Unknown action. Use deleteMany or removeDuplicates." }, { status: 400 });
}
