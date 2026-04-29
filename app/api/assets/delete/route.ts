import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { contentIdFromVideoFilename } from "@/app/lib/asset-manifest";
import { deleteBuild } from "@/app/lib/delete-build";

type Body = {
  contentId?: string;
  /** Manifest row only: remove this entry; assets stay if another row shares the same `contentId`. */
  createdAt?: string;
  /** e.g. `video/foo-short.mp4` — deletes that build if name matches `-short.mp4` */
  videoRel?: string;
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

  let contentId = body.contentId?.trim();
  if (!contentId && body.videoRel?.trim()) {
    const base = body.videoRel.trim().replace(/^video\//, "");
    contentId = contentIdFromVideoFilename(base) ?? undefined;
  }

  if (!contentId) {
    return NextResponse.json(
      { error: "Provide contentId or videoRel (e.g. video/my-id-short.mp4)" },
      { status: 400 },
    );
  }

  const createdAt = body.createdAt?.trim() || undefined;

  try {
    const { deleted } = await deleteBuild({ contentId, createdAt });
    return NextResponse.json({ ok: true, contentId, createdAt: createdAt ?? null, deleted });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
