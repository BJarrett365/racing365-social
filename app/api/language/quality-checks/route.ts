import { NextResponse } from "next/server";
import { runLanguageQualityChecks } from "@/app/lib/language-studio/quality-checks";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const translationId = url.searchParams.get("translationId") ?? "";
    const data = await readLanguageStudioData();
    const translation = data.translations[translationId];
    if (!translation) return NextResponse.json({ error: "Translation not found." }, { status: 404 });
    const article = data.articles[translation.articleId];
    if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });
    const check = runLanguageQualityChecks(article, translation, Object.values(data.protectedTerms));
    data.qualityChecks[check.id] = check;
    await writeLanguageStudioData(data);
    return NextResponse.json({ qualityCheck: check });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quality check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { checkId?: string; issueId?: string; action?: "ignore" | "escalate" } | null;
    if (!body?.checkId || !body.issueId || !body.action) return NextResponse.json({ error: "checkId, issueId and action are required." }, { status: 400 });
    const data = await readLanguageStudioData();
    const check = data.qualityChecks[body.checkId];
    if (!check) return NextResponse.json({ error: "Quality check not found." }, { status: 404 });
    check.issues = check.issues.map((issue) => issue.id === body.issueId ? { ...issue, ignored: body.action === "ignore" ? true : issue.ignored, escalated: body.action === "escalate" ? true : issue.escalated } : issue);
    const activeIssues = check.issues.filter((issue) => !issue.ignored);
    check.score = activeIssues.some((issue) => issue.severity === "red") ? "red" : activeIssues.some((issue) => issue.severity === "amber") ? "amber" : "green";
    check.updatedAt = new Date().toISOString();
    data.qualityChecks[check.id] = check;
    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, qualityCheck: check });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quality check update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
