import { NextResponse } from "next/server";
import {
  runMatchReportPushActions,
} from "@/app/lib/match-report/push-match-report-actions";
import type { MatchReportPushAction } from "@/app/lib/match-report/match-report-distribution";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";

export const dynamic = "force-dynamic";

const ACTIONS: MatchReportPushAction[] = ["calendar", "publish", "rewrite", "language", "all"];

type Body = {
  projectId?: string;
  action?: MatchReportPushAction;
  actions?: MatchReportPushAction[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const actions = body.actions?.length
      ? body.actions
      : body.action
        ? [body.action]
        : [];
    if (actions.length === 0) {
      return NextResponse.json({ error: "action or actions is required." }, { status: 400 });
    }
    if (actions.some((action) => !ACTIONS.includes(action))) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const { project, results } = await runMatchReportPushActions(getMatchReportRepository(), projectId, actions);
    return NextResponse.json({ ok: true, project, results });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Push action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
