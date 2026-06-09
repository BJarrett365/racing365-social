import { NextResponse } from "next/server";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import { runMatchReportFactCheck } from "@/app/lib/match-report/fact-check";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import type { MediaOutputs } from "@/app/lib/match-report/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteParams = { params: Promise<{ id: string }> };

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    throw new Error("OpenAI returned invalid JSON.");
  }
}

function normaliseMediaOutputs(value: unknown, current: MediaOutputs): MediaOutputs {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    ...current,
    headline: String(row.headline ?? current.headline).trim() || current.headline,
    standfirst: String(row.standfirst ?? current.standfirst).trim() || current.standfirst,
    reportHtml: String(row.reportHtml ?? current.reportHtml).trim() || current.reportHtml,
    generatedAt: current.generatedAt,
  };
}

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const repo = getMatchReportRepository();
    const project = await repo.getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!project.mediaOutputs) {
      return NextResponse.json({ error: "Generate media outputs before repairing fact-check issues." }, { status: 400 });
    }

    const key = await getServerSecretAsync("OPENAI_API_KEY");
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is required to repair the report." }, { status: 503 });

    const factCheck = project.factCheck ?? runMatchReportFactCheck(project);
    const settings = await readStoredSettingsAsync();
    const model = settings.languageOpenaiModel?.trim() || process.env.LANGUAGE_OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const prompt = [
      "You are repairing a sports match report for Plexa Match Report Studio.",
      "Fix factual issues while preserving the article structure, style, brand voice and useful analysis.",
      "Do not invent quotes, scorers, statistics, injuries, cards or timelines.",
      "If a direct quote is unsupported, remove it or convert it to a clearly attributed paraphrase.",
      "Return strict JSON with headline, standfirst and reportHtml only.",
      "",
      "Match:",
      JSON.stringify({
        homeTeam: project.homeTeam,
        awayTeam: project.awayTeam,
        score: `${project.homeScore ?? "?"}-${project.awayScore ?? "?"}`,
        competition: project.competition,
        reportFormat: project.reportFormat,
      }, null, 2),
      "",
      "Fact-check issues to resolve:",
      JSON.stringify(factCheck.issues, null, 2),
      "",
      "Story context / Tier 1 facts:",
      JSON.stringify(factCheck.storyContext, null, 2).slice(0, 12000),
      "",
      "Current output:",
      JSON.stringify({
        headline: project.mediaOutputs.headline,
        standfirst: project.mediaOutputs.standfirst,
        reportHtml: project.mediaOutputs.reportHtml,
      }, null, 2),
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a precise football editor and fact-check repair assistant. Return JSON only." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `OpenAI repair failed (${res.status}).`);

    const repaired = normaliseMediaOutputs(extractJsonObject(json.choices?.[0]?.message?.content ?? "{}"), project.mediaOutputs);
    await repo.updateMediaOutputs(id, repaired);
    const repairedProject = await repo.getProject(id);
    if (!repairedProject) return NextResponse.json({ error: "Project not found after repair." }, { status: 404 });
    const repairedFactCheck = runMatchReportFactCheck(repairedProject);
    const updated = await repo.setFactCheck(id, { ...repairedFactCheck, model });
    return NextResponse.json({ project: updated, factCheck: repairedFactCheck });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Fact-check repair failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
