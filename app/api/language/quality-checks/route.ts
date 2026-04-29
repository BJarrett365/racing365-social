import { NextResponse } from "next/server";
import { runLanguageQualityChecks } from "@/app/lib/language-studio/quality-checks";
import { readLanguageStudioData, upsertQualityCheck } from "@/app/lib/language-studio/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const translationId = url.searchParams.get("translationId") ?? "";
  const data = await readLanguageStudioData();
  const translation = data.translations[translationId];
  if (!translation) return NextResponse.json({ error: "Translation not found." }, { status: 404 });
  const article = data.articles[translation.articleId];
  if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });
  const check = runLanguageQualityChecks(article, translation, Object.values(data.protectedTerms));
  await upsertQualityCheck(check);
  return NextResponse.json({ qualityCheck: check });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { checkId?: string; issueId?: string; action?: "ignore" | "escalate" } | null;
  if (!body?.checkId || !body.issueId || !body.action) return NextResponse.json({ error: "checkId, issueId and action are required." }, { status: 400 });
  const data = await readLanguageStudioData();
  const check = data.qualityChecks[body.checkId];
  if (!check) return NextResponse.json({ error: "Quality check not found." }, { status: 404 });
  check.issues = check.issues.map((issue) => issue.id === body.issueId ? { ...issue, ignored: body.action === "ignore" ? true : issue.ignored, escalated: body.action === "escalate" ? true : issue.escalated } : issue);
  const activeIssues = check.issues.filter((issue) => !issue.ignored);
  check.score = activeIssues.some((issue) => issue.severity === "red") ? "red" : activeIssues.some((issue) => issue.severity === "amber") ? "amber" : "green";
  check.updatedAt = new Date().toISOString();
  await upsertQualityCheck(check);
  return NextResponse.json({ success: true, qualityCheck: check });
}
