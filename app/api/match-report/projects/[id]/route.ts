import { NextResponse } from "next/server";
import { buildMatchFoundationSummary } from "@/app/lib/match-report/normalise-sixlogics";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import type { PatchMatchReportProjectInput } from "@/app/lib/match-report/types";

const repo = getMatchReportRepository();

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await repo.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const foundation = project.layers.sixLogic;
    return NextResponse.json({
      project,
      foundationSummary: foundation ? buildMatchFoundationSummary(foundation) : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as PatchMatchReportProjectInput;
    const project = await repo.patchProject(id, body);
    return NextResponse.json({ project });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Patch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await repo.deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
