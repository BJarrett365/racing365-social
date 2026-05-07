import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import {
  nextRunAt,
  normaliseClockValue,
  normaliseFrequency,
  normaliseIntervalMinutes,
  normaliseTimezone,
  normaliseWeekdays,
} from "@/app/lib/language-studio/cron-scheduler";
import { runLanguageCronJob } from "@/app/lib/language-studio/cron-runner";
import {
  deleteCronJob,
  newLanguageId,
  readLanguageStudioData,
  sortDesc,
  upsertCronJob,
} from "@/app/lib/language-studio/store";
import type { LanguageCode, LanguageCronJob, LanguageSourceParserType } from "@/app/lib/language-studio/types";

type Body = Partial<LanguageCronJob> & {
  action?: "run-now";
  adminToken?: string;
  notificationWebhookUrl?: string;
};

const PARSER_TYPES: LanguageSourceParserType[] = ["rss-default", "wordpress-rss", "json-api", "html-page", "custom"];

function parserType(value: unknown): LanguageSourceParserType {
  return typeof value === "string" && PARSER_TYPES.includes(value as LanguageSourceParserType)
    ? (value as LanguageSourceParserType)
    : "rss-default";
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

export async function GET() {
  try {
    const data = await readLanguageStudioData();
    return NextResponse.json({
      jobs: sortDesc(Object.values(data.cronJobs)),
      runs: sortDesc(Object.values(data.cronRuns)).slice(0, 100),
      clients: sortDesc(Object.values(data.clients)),
      sourceBrands: sortDesc(Object.values(data.sourceBrands)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load crons.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    const denied = assertAdminWrite(req, body.adminToken);
    if (denied) return denied;

    if (body.action === "run-now") {
      if (!body.id) return NextResponse.json({ error: "Cron job id is required." }, { status: 400 });
      const run = await runLanguageCronJob(body.id, "manual");
      return NextResponse.json({ success: true, run });
    }

    const data = await readLanguageStudioData();
    const now = new Date().toISOString();
    const existing = body.id ? data.cronJobs[body.id] : undefined;
    const source = body.sourceBrand
      ? Object.values(data.sourceBrands).find((row) => row.name === body.sourceBrand)
      : undefined;
    const sourceBrand = body.sourceBrand?.trim() || source?.name || "Sportinglife";
    const sourceUrl = body.sourceUrl?.trim() || source?.feedUrl || "";
    if (!body.name?.trim()) return NextResponse.json({ error: "Cron name is required." }, { status: 400 });
    if (!sourceUrl) return NextResponse.json({ error: "Source URL is required." }, { status: 400 });

    const row: LanguageCronJob = {
      id: existing?.id || body.id || newLanguageId("lcron"),
      name: body.name.trim(),
      active: body.active ?? existing?.active ?? true,
      clientIds: strings(body.clientIds).filter((id) => Boolean(data.clients[id]?.active)),
      sourceBrand,
      sourceLanguage: body.sourceLanguage || source?.sourceLanguage || ("en" as LanguageCode),
      sourceUrl,
      parserType: parserType(body.parserType || source?.parserType),
      frequency: normaliseFrequency(body.frequency),
      intervalMinutes: normaliseIntervalMinutes(body.intervalMinutes),
      hour: normaliseClockValue(body.hour, 23),
      minute: normaliseClockValue(body.minute, 59),
      weekdays: normaliseWeekdays(body.weekdays),
      timezone: normaliseTimezone(body.timezone),
      processImages: body.processImages ?? true,
      importFullArticles: body.importFullArticles ?? true,
      notifyOnFailure: body.notifyOnFailure ?? false,
      notificationEmail: body.notificationEmail?.trim() || body.notificationWebhookUrl?.trim() || "",
      lastRunAt: existing?.lastRunAt,
      lastSuccessAt: existing?.lastSuccessAt,
      lastFailureAt: existing?.lastFailureAt,
      lastRunStatus: existing?.lastRunStatus,
      lastRunMessage: existing?.lastRunMessage,
      consecutiveFailures: existing?.consecutiveFailures ?? 0,
      createdAt: existing?.createdAt || body.createdAt || now,
      updatedAt: now,
    };
    row.nextRunAt = body.nextRunAt || existing?.nextRunAt || nextRunAt(row);
    await upsertCronJob(row);
    return NextResponse.json({ success: true, job: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim();
    const denied = assertAdminWrite(req, url.searchParams.get("adminToken") ?? undefined);
    if (denied) return denied;
    if (!id) return NextResponse.json({ error: "Cron job id is required." }, { status: 400 });
    const deleted = await deleteCronJob(id);
    if (!deleted) return NextResponse.json({ error: "Cron job not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
