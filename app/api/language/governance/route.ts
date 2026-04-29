import { NextResponse } from "next/server";
import {
  newLanguageId,
  readLanguageStudioData,
  sortDesc,
  upsertComplianceNote,
  upsertGuardrail,
  upsertMarketRule,
  upsertPromptRule,
  upsertProtectedTerm,
  upsertSportRule,
} from "@/app/lib/language-studio/store";
import type {
  LanguageComplianceNote,
  LanguageGuardrail,
  LanguageMarketRule,
  LanguagePromptRule,
  LanguageProtectedTerm,
  LanguageSportRule,
} from "@/app/lib/language-studio/types";

type Collection = "guardrails" | "protectedTerms" | "marketRules" | "sportRules" | "promptRules" | "complianceNotes";

type Body = {
  collection?: Collection;
  item?: Record<string, unknown>;
};

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({
    guardrails: sortDesc(Object.values(data.guardrails)),
    protectedTerms: sortDesc(Object.values(data.protectedTerms)),
    marketRules: sortDesc(Object.values(data.marketRules)),
    sportRules: sortDesc(Object.values(data.sportRules)),
    promptRules: sortDesc(Object.values(data.promptRules)),
    complianceNotes: sortDesc(Object.values(data.complianceNotes)),
    translationMemory: sortDesc(Object.values(data.translationMemory)),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.collection || !body.item) return NextResponse.json({ error: "collection and item are required." }, { status: 400 });
  const now = new Date().toISOString();
  const item = body.item;

  if (body.collection === "guardrails") {
    const row: LanguageGuardrail = {
      id: String(item.id || newLanguageId("lguard")),
      category: (item.category as LanguageGuardrail["category"]) || "fact-safety",
      title: String(item.title || "").trim(),
      rule: String(item.rule || "").trim(),
      severity: (item.severity as LanguageGuardrail["severity"]) || "amber",
      active: item.active !== false,
      createdAt: String(item.createdAt || now),
      updatedAt: now,
    };
    if (!row.title || !row.rule) return NextResponse.json({ error: "title and rule are required." }, { status: 400 });
    await upsertGuardrail(row);
    return NextResponse.json({ success: true, item: row });
  }

  if (body.collection === "protectedTerms") {
    const row: LanguageProtectedTerm = {
      id: String(item.id || newLanguageId("lterm")),
      term: String(item.term || "").trim(),
      type: (item.type as LanguageProtectedTerm["type"]) || "technical term",
      doNotTranslate: item.doNotTranslate !== false,
      approvedVariants: Array.isArray(item.approvedVariants) ? item.approvedVariants.map(String).filter(Boolean) : [],
      notes: String(item.notes || ""),
      createdAt: String(item.createdAt || now),
      updatedAt: now,
    };
    if (!row.term) return NextResponse.json({ error: "term is required." }, { status: 400 });
    await upsertProtectedTerm(row);
    return NextResponse.json({ success: true, item: row });
  }

  if (body.collection === "marketRules") {
    const row: LanguageMarketRule = {
      id: String(item.id || newLanguageId("lmarket")),
      market: String(item.market || "").trim(),
      language: (item.language as LanguageMarketRule["language"]) || "es",
      locale: String(item.locale || "").trim(),
      direction: item.direction === "rtl" ? "rtl" : "ltr",
      seoKeywordRules: String(item.seoKeywordRules || ""),
      toneRules: String(item.toneRules || ""),
      spellingRules: String(item.spellingRules || ""),
      headlineStyleNotes: String(item.headlineStyleNotes || ""),
      seoNotes: String(item.seoNotes || ""),
      dateFormat: String(item.dateFormat || "locale"),
      timeFormat: String(item.timeFormat || "locale"),
      currencyFormat: String(item.currencyFormat || "locale"),
      complianceNotes: String(item.complianceNotes || ""),
      fallbackProvider: (item.fallbackProvider as LanguageMarketRule["fallbackProvider"]) || "openai",
      createdAt: String(item.createdAt || now),
      updatedAt: now,
    };
    if (!row.market || !row.locale) return NextResponse.json({ error: "market and locale are required." }, { status: 400 });
    await upsertMarketRule(row);
    return NextResponse.json({ success: true, item: row });
  }

  if (body.collection === "sportRules") {
    const row: LanguageSportRule = {
      id: String(item.id || newLanguageId("lsport")),
      sport: String(item.sport || "").trim(),
      keyTerms: Array.isArray(item.keyTerms) ? item.keyTerms.map(String).filter(Boolean) : [],
      dataRules: String(item.dataRules || ""),
      protectedStats: Array.isArray(item.protectedStats) ? item.protectedStats.map(String).filter(Boolean) : [],
      namingConventions: String(item.namingConventions || ""),
      examples: String(item.examples || ""),
      createdAt: String(item.createdAt || now),
      updatedAt: now,
    };
    if (!row.sport) return NextResponse.json({ error: "sport is required." }, { status: 400 });
    await upsertSportRule(row);
    return NextResponse.json({ success: true, item: row });
  }

  if (body.collection === "promptRules") {
    const row: LanguagePromptRule = {
      id: String(item.id || newLanguageId("lprompt")),
      language: (item.language as LanguagePromptRule["language"]) || "",
      contentType: String(item.contentType || "").trim(),
      promptInstruction: String(item.promptInstruction || "").trim(),
      priority: Number(item.priority || 0),
      active: item.active !== false,
      createdAt: String(item.createdAt || now),
      updatedAt: now,
    };
    if (!row.contentType || !row.promptInstruction) return NextResponse.json({ error: "contentType and promptInstruction are required." }, { status: 400 });
    await upsertPromptRule(row);
    return NextResponse.json({ success: true, item: row });
  }

  const row: LanguageComplianceNote = {
    id: String(item.id || newLanguageId("lcompliance")),
    market: String(item.market || "").trim(),
    riskType: String(item.riskType || "").trim(),
    rule: String(item.rule || "").trim(),
    action: String(item.action || "").trim(),
    escalationRequired: Boolean(item.escalationRequired),
    createdAt: String(item.createdAt || now),
    updatedAt: now,
  };
  if (!row.market || !row.riskType || !row.rule) return NextResponse.json({ error: "market, riskType and rule are required." }, { status: 400 });
  await upsertComplianceNote(row);
  return NextResponse.json({ success: true, item: row });
}
