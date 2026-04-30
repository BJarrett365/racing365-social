import { NextResponse } from "next/server";
import { translateContent } from "@/app/lib/language-studio/language-engine";
import {
  newLanguageId,
  readLanguageStudioData,
  writeLanguageStudioData,
} from "@/app/lib/language-studio/store";
import type {
  LanguageCode,
  LanguageProviderMode,
  LanguageTranslation,
  TranslationMode,
} from "@/app/lib/language-studio/types";

type Body = {
  articleId?: string;
  articleIds?: string[];
  targetLanguages?: LanguageCode[];
  providerMode?: LanguageProviderMode;
  translationMode?: TranslationMode;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const data = await readLanguageStudioData();
    const articleIds = Array.isArray(body.articleIds) && body.articleIds.length > 0
      ? body.articleIds
      : body.articleId
        ? [body.articleId]
        : [];
    const articles = articleIds.map((id) => data.articles[id]).filter((article): article is NonNullable<typeof article> => Boolean(article));
    if (articles.length === 0) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    const targetLanguages = Array.isArray(body.targetLanguages) ? body.targetLanguages : [];
    if (targetLanguages.length === 0) return NextResponse.json({ error: "Select at least one target language." }, { status: 400 });

    const now = new Date().toISOString();
    const translations: LanguageTranslation[] = [];

    for (const article of articles) {
      const glossary = Object.values(data.glossary).filter((entry) => entry.brand === article.sourceBrand || entry.brand === "Global");
      const rules = Object.values(data.rules).filter((rule) => rule.brand === article.sourceBrand || rule.brand === "Global");
      for (const targetLanguage of targetLanguages) {
        const fields = await translateContent({
          article,
          targetLanguage,
          providerMode: body.providerMode,
          translationMode: body.translationMode ?? "translate-localise",
          glossary,
          rules,
          guardrails: Object.values(data.guardrails),
          protectedTerms: Object.values(data.protectedTerms),
          marketRules: Object.values(data.marketRules),
          sportRules: Object.values(data.sportRules),
          promptRules: Object.values(data.promptRules),
          complianceNotes: Object.values(data.complianceNotes),
        });
        const row: LanguageTranslation = {
          id: newLanguageId("ltrans"),
          articleId: article.id,
          targetLanguage,
          providerMode: body.providerMode ?? "openai",
          translationMode: body.translationMode ?? "translate-localise",
          status: "draft",
          createdAt: now,
          updatedAt: now,
          ...fields,
        };
        data.translations[row.id] = row;
        article.status = "translated";
        article.updatedAt = now;
        translations.push(row);
        const auditId = newLanguageId("laudit");
        data.auditLogs[auditId] = {
          id: auditId,
          createdAt: now,
          entityType: "language_translation",
          entityId: row.id,
          action: "translate",
          detail: `${article.title} → ${targetLanguage}`,
        };
      }
    }

    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, translations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Translation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
