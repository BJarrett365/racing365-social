import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import {
  deleteArticleAutomation,
  newLanguageId,
  readLanguageStudioData,
  sortDesc,
  upsertArticleAutomation,
} from "@/app/lib/language-studio/store";
import { LANGUAGE_CONTENT_STYLES, LANGUAGE_SPORT_CONTEXTS, type LanguageArticleAutomation, type LanguageArticleAutomationAction, type LanguageArticleAutomationOutputStatus, type LanguageCode, type LanguageContentStyle, type LanguageProviderMode, type LanguageSportContext, type TranslationMode } from "@/app/lib/language-studio/types";

type Body = Partial<LanguageArticleAutomation> & {
  adminToken?: string;
};

const actions: LanguageArticleAutomationAction[] = ["rewrite", "translate", "rewrite-translate"];
const outputStatuses: LanguageArticleAutomationOutputStatus[] = ["review_needed", "draft"];
const contentStyles: LanguageContentStyle[] = [...LANGUAGE_CONTENT_STYLES];
const sportContexts: LanguageSportContext[] = LANGUAGE_SPORT_CONTEXTS;
const providerModes: LanguageProviderMode[] = ["openai", "deepl", "deepl-openai"];
const translationModes: TranslationMode[] = ["translate-only", "translate-localise", "translate-rewrite", "headline-only", "seo-only", "summary-only"];

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

export async function GET() {
  try {
    const data = await readLanguageStudioData();
    return NextResponse.json({
      automations: sortDesc(Object.values(data.articleAutomations)),
      clients: sortDesc(Object.values(data.clients)),
      sourceBrands: sortDesc(Object.values(data.sourceBrands)),
      journalistProfiles: sortDesc(Object.values(data.journalistProfiles)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load article automations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    const denied = assertAdminWrite(req, body.adminToken);
    if (denied) return denied;

    const data = await readLanguageStudioData();
    const now = new Date().toISOString();
    const existing = body.id ? data.articleAutomations[body.id] : undefined;
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Automation name is required." }, { status: 400 });

    const row: LanguageArticleAutomation = {
      id: existing?.id || body.id || newLanguageId("lauto"),
      name,
      active: body.active ?? existing?.active ?? true,
      clientIds: strings(body.clientIds).filter((id) => Boolean(data.clients[id]?.active)),
      sourceBrands: strings(body.sourceBrands),
      action: oneOf(body.action, actions, "rewrite"),
      contentStyle: oneOf(body.contentStyle, contentStyles, "Preview"),
      sportContext: oneOf(body.sportContext, sportContexts, "Horse Racing"),
      journalistProfileId: body.journalistProfileId?.trim() || "",
      rewriteStyle: body.rewriteStyle?.trim() || "Original editorial rewrite for Google: fresh structure, sharp intro, natural expert sports tone, no synonym spinning.",
      editorialGuidelines: body.editorialGuidelines?.trim() || "Preserve quotes exactly in meaning and quote boundaries. Do not add facts, claims, results or opinion. Keep names, teams, numbers, dates and locations unchanged.",
      targetLanguages: strings(body.targetLanguages) as LanguageCode[],
      providerMode: oneOf(body.providerMode, providerModes, "openai"),
      translationMode: oneOf(body.translationMode, translationModes, "translate-localise"),
      outputStatus: oneOf(body.outputStatus, outputStatuses, "review_needed"),
      maxArticlesPerRun: positiveInt(body.maxArticlesPerRun, 10),
      onlyNewArticles: body.onlyNewArticles ?? true,
      autoApprove: false,
      createdAt: existing?.createdAt || body.createdAt || now,
      updatedAt: now,
    };
    await upsertArticleAutomation(row);
    return NextResponse.json({ success: true, automation: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Article automation save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const denied = assertAdminWrite(req, url.searchParams.get("adminToken") ?? undefined);
    if (denied) return denied;
    const id = url.searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "Automation id is required." }, { status: 400 });
    const deleted = await deleteArticleAutomation(id);
    if (!deleted) return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Article automation delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
