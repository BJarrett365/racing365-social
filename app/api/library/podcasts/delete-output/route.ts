import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { outputDir } from "@/app/lib/paths";
import { ProjectStorageService } from "@/lib/podcast-template/project-storage-service";

type Body = { projectIds?: string[]; adminToken?: string };

const MAX_BATCH = 500;

function safeUnderOutput(rel: string, rootResolved: string): string | null {
  const cleaned = rel.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) return null;
  const full = path.resolve(rootResolved, ...cleaned.split("/"));
  const rootSep = rootResolved.endsWith(path.sep) ? rootResolved : `${rootResolved}${path.sep}`;
  if (full === rootResolved || full.startsWith(rootSep)) return full;
  return null;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const ids = [
    ...new Set(
      (Array.isArray(body.projectIds) ? body.projectIds : [])
        .map((x) => String(x).trim())
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide projectIds array." }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `At most ${MAX_BATCH} projects per request.` }, { status: 400 });
  }

  const svc = new ProjectStorageService();
  const root = path.resolve(outputDir());
  let removedFiles = 0;
  let projectsUpdated = 0;

  for (const projectId of ids) {
    const p = await svc.get(projectId);
    const rel = p?.outputAudioRel?.trim();
    if (!p || !rel) continue;

    const full = safeUnderOutput(rel, root);
    if (full) {
      try {
        await fs.unlink(full);
        removedFiles += 1;
      } catch {
        /* missing */
      }
    }

    const next = { ...p, outputAudioRel: undefined as string | undefined };
    await svc.upsert(next);
    projectsUpdated += 1;
  }

  return NextResponse.json({ ok: true, removedFiles, projectsUpdated });
}
