import { NextResponse } from "next/server";
import {
  fetchInterviewFromYoutube,
  sendInterviewToLanguageStudioRewrite,
} from "@/app/lib/match-report/import-interview";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import { withAppPathPrefix } from "@/app/lib/app-base-path";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

type Body = {
  projectId?: string;
  url?: string;
  interviewId?: string;
  complete?: boolean;
  skip?: boolean;
  sendToRewrite?: boolean;
  deleteInterviewId?: string;
  team?: "home" | "away" | "neutral";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }
    const repo = getMatchReportRepository();
    if (body.skip) {
      const project = await repo.skipTranscriptsStep(projectId);
      return NextResponse.json({ project });
    }
    if (body.complete) {
      const project = await repo.completeTranscriptsStep(projectId);
      return NextResponse.json({ project });
    }
    const deleteInterviewId = body.deleteInterviewId?.trim();
    if (deleteInterviewId) {
      const project = await repo.deleteInterview(projectId, deleteInterviewId);
      return NextResponse.json({ project });
    }
    if (body.sendToRewrite) {
      const interviewId = body.interviewId?.trim();
      if (!interviewId) {
        return NextResponse.json({ error: "interviewId is required for sendToRewrite." }, { status: 400 });
      }
      const project = await repo.getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }
      const interview = project.layers.interviews.find((row) => row.id === interviewId);
      if (!interview) {
        return NextResponse.json({ error: "Interview not found." }, { status: 404 });
      }
      const { articleId, title } = await sendInterviewToLanguageStudioRewrite(interview);
      const updated = await repo.updateInterview(projectId, interviewId, { languageArticleId: articleId });
      const rewriteUrl = withAppPathPrefix(
        `/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(articleId)}`,
      );
      return NextResponse.json({ project: updated, languageArticle: { id: articleId, title }, rewriteUrl });
    }
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json(
        { error: "url is required unless complete, skip, sendToRewrite, or deleteInterviewId." },
        { status: 400 },
      );
    }
    const project = await repo.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    const team = body.team === "home" || body.team === "away" || body.team === "neutral" ? body.team : undefined;
    const interview = await fetchInterviewFromYoutube(url, {
      editorial: project.editorial,
      ...(team ? { team } : {}),
    });
    const updated = await repo.importInterview(projectId, interview);
    return NextResponse.json({ project: updated, interview });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    const message = e instanceof Error ? e.message : "Interview import failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
