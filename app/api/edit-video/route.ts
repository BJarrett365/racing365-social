import { NextResponse } from "next/server";
import { trimVideoToEdited } from "@/app/features/video/edit-video";

type Body = {
  contentId?: string;
  videoRel?: string;
  trimStartSec?: number;
  trimEndSec?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contentId = body.contentId?.trim();
  const videoRel = body.videoRel?.trim();
  if (!contentId || !videoRel) {
    return NextResponse.json({ error: "contentId and videoRel required" }, { status: 400 });
  }

  try {
    const result = await trimVideoToEdited({
      contentId,
      sourceVideoRel: videoRel,
      trimStartSec: body.trimStartSec ?? 0,
      trimEndSec: body.trimEndSec ?? 0,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Edit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
