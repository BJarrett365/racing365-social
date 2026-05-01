import { NextResponse } from "next/server";
import { stripArticleMetadataLines, stripGeneratedArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { generateSocialPosts, translateContent } from "@/app/lib/language-studio/language-engine";
import {
  newLanguageId,
  readLanguageStudioData,
  writeLanguageStudioData,
} from "@/app/lib/language-studio/store";
import type {
  LanguageContentStyle,
  LanguageJournalistProfile,
  LanguageProviderMode,
  LanguageSportContext,
  LanguageTranslation,
} from "@/app/lib/language-studio/types";

type Body = {
  articleId?: string;
  articleIds?: string[];
  providerMode?: LanguageProviderMode;
  journalistProfileId?: string;
  rewriteStyle?: string;
  journalistStyle?: string;
  editorialGuidelines?: string;
  contentStyle?: LanguageContentStyle;
  sportContext?: LanguageSportContext;
};

function profileForArticle(profiles: LanguageJournalistProfile[], article: { author?: string; sourceBrand: string }, selectedId?: string): LanguageJournalistProfile | undefined {
  if (selectedId) return profiles.find((profile) => profile.id === selectedId && profile.active);
  const author = article.author?.trim().toLowerCase();
  if (!author) return undefined;
  return profiles.find((profile) => profile.active && profile.brand === article.sourceBrand && profile.name.trim().toLowerCase() === author);
}

function hasCompleteSocialPosts(row: Pick<LanguageTranslation, "socialPosts">): boolean {
  const required = new Set(["appAlerts", "facebook", "x", "instagram", "youtube", "tiktok", "whatsapp", "telegram"]);
  for (const post of row.socialPosts ?? []) {
    if (post.text.trim()) required.delete(post.platform);
  }
  return required.size === 0;
}

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

    const now = new Date().toISOString();
    const rewrites: LanguageTranslation[] = [];

    for (const sourceArticle of articles) {
      const article = {
        ...sourceArticle,
        body: stripArticleMetadataLines(sourceArticle.body, sourceArticle),
      };
      const glossary = Object.values(data.glossary).filter((entry) => entry.brand === article.sourceBrand || entry.brand === "Global");
      const rules = Object.values(data.rules).filter((rule) => rule.brand === article.sourceBrand || rule.brand === "Global");
      const profile = profileForArticle(Object.values(data.journalistProfiles), article, body.journalistProfileId);
      const journalistStyle = body.journalistStyle || (profile ? `${profile.name} (${profile.brand})\n${profile.styleNotes}` : undefined);
      const editorialGuidelines = body.editorialGuidelines || profile?.articleGuidelines;
      const fields = await translateContent({
        article,
        targetLanguage: article.sourceLanguage,
        providerMode: body.providerMode ?? "openai",
        translationMode: "rewrite-only",
        rewriteStyle: body.rewriteStyle,
        journalistStyle,
        editorialGuidelines,
        contentStyle: body.contentStyle,
        sportContext: body.sportContext,
        glossary,
        rules,
        guardrails: Object.values(data.guardrails),
        protectedTerms: Object.values(data.protectedTerms),
        marketRules: Object.values(data.marketRules),
        sportRules: Object.values(data.sportRules),
        promptRules: Object.values(data.promptRules),
        knowledgeFiles: Object.values(data.knowledgeFiles),
        complianceNotes: Object.values(data.complianceNotes),
      });
      const row: LanguageTranslation = {
        id: newLanguageId("lrewrite"),
        articleId: article.id,
        targetLanguage: article.sourceLanguage,
        providerMode: body.providerMode ?? "openai",
        translationMode: "rewrite-only",
        status: "draft",
        createdAt: now,
        updatedAt: now,
        editorNotes: [
          body.rewriteStyle ? `Style: ${body.rewriteStyle}` : "",
          journalistStyle ? `Journalist style: ${journalistStyle}` : "",
          body.contentStyle ? `Content style: ${body.contentStyle}` : "",
          body.sportContext ? `Sport: ${body.sportContext}` : "",
          editorialGuidelines ? `Guidelines: ${editorialGuidelines}` : "",
        ].filter(Boolean).join("\n"),
        ...fields,
        body: stripGeneratedArticleMetadataLines(fields.body, article, fields.title),
      };
      if (!hasCompleteSocialPosts(row)) {
        row.socialPosts = await generateSocialPosts({
          article,
          translation: row,
          knowledgeFiles: Object.values(data.knowledgeFiles),
        });
      }
      data.translations[row.id] = row;
      article.status = "review_needed";
      article.updatedAt = now;
      rewrites.push(row);
      const auditId = newLanguageId("laudit");
      data.auditLogs[auditId] = {
        id: auditId,
        createdAt: now,
        entityType: "language_translation",
        entityId: row.id,
        action: "rewrite",
        detail: `${article.title} rewritten for ${article.sourceBrand}`,
      };
    }

    await writeLanguageStudioData(data);
    return NextResponse.json({ success: true, rewrites });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rewrite failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
