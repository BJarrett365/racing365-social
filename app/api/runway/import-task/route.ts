import { NextResponse } from "next/server";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { isSafeContentId, saveRunwayImageBufferToLibraryBackground, saveVideoBufferToEditorUpload } from "@/app/lib/editor-upload";
import { RUNWAY_API_BASE, RUNWAY_API_VERSION } from "@/app/lib/runway-api-constants";
import { firstRunwayTaskOutputUrl } from "@/app/lib/runway-task-output";

type Body = {
  contentId: string;
  taskId: string;
  /** Use `image` for text-to-image / still outputs; default `video` for Runway video tasks. */
  assetKind?: "video" | "image";
};

export async function POST(request: Request) {
  const key = await getServerSecretAsync("RUNWAYML_API_SECRET");
  if (!key) {
    return NextResponse.json({ error: "Runway API secret not configured." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contentId = typeof body.contentId === "string" ? body.contentId.trim() : "";
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  const assetKind = body.assetKind === "image" ? "image" : "video";
  if (!isSafeContentId(contentId) || !taskId) {
    return NextResponse.json({ error: "contentId and taskId are required." }, { status: 400 });
  }

  try {
    const res = await fetch(`${RUNWAY_API_BASE}/v1/tasks/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const task = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const msg = typeof task.error === "string" ? task.error : `Runway error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (task.status === "FAILED") {
      const fail = typeof task.failure === "string" ? task.failure : "Task failed";
      return NextResponse.json({ error: fail, status: task.status }, { status: 400 });
    }

    if (task.status !== "SUCCEEDED") {
      return NextResponse.json(
        {
          ok: false,
          status: task.status,
          message: "Task is not finished yet. Poll again in a few seconds.",
        },
        { status: 409 },
      );
    }

    const url = firstRunwayTaskOutputUrl(task);
    if (!url) {
      return NextResponse.json({ error: "No output URL on succeeded task." }, { status: 502 });
    }

    const assetRes = await fetch(url, { cache: "no-store" });
    if (!assetRes.ok) {
      return NextResponse.json(
        { error: `Could not download asset (${assetRes.status}).` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await assetRes.arrayBuffer());

    if (assetKind === "image") {
      const ct = assetRes.headers.get("content-type");
      const result = await saveRunwayImageBufferToLibraryBackground(contentId, buf, ct);
      return NextResponse.json({ ok: true, importMode: "image" as const, ...result });
    }

    const result = await saveVideoBufferToEditorUpload(contentId, buf);
    return NextResponse.json({ ok: true, importMode: "video" as const, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
