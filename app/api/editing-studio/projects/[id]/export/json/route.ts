import { NextResponse } from "next/server";
import { buildEditingProjectExport } from "@/features/editing-studio/export/build-editing-project-export";
import { getEditingStudioRepository } from "@/features/editing-studio/services/editing-studio-repository";
import {
  editingProjectExportRequestBodySchema,
  parseEditingProjectExportPayload,
} from "@/features/editing-studio/validators/editing-project-export-payload-schema";

const repo = getEditingStudioRepository();

/**
 * Build and return a validated `EditingProjectExport` JSON payload (schema v1).
 * Optional body: `{ assetIds?: string[], platforms?: PlatformType[] }` to narrow the snapshot.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await repo.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsedBody = editingProjectExportRequestBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      const msg = parsedBody.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const built = buildEditingProjectExport(project, parsedBody.data);
    const validated = parseEditingProjectExportPayload(built);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "Export payload failed validation", details: validated.error },
        { status: 500 },
      );
    }

    await repo.addExport({
      projectId: id,
      format: "json",
      revision: project.revision,
      payload: validated.data as unknown as Record<string, unknown>,
      source: "api",
      meta: { endpoint: "export/json", filters: parsedBody.data },
    });

    return NextResponse.json({ export: validated.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
