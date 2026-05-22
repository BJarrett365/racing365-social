import { stripArticleMetadataLines, stripGeneratedArticleMetadataLines } from "@/app/lib/language-studio/article-pages";
import { scheduleDeferredSocialPostsForTranslation } from "@/app/lib/language-studio/deferred-social-posts";
import { contentStyleFromArticle, sportContextFromArticle } from "@/app/lib/language-studio/article-context";
import { translateContent } from "@/app/lib/language-studio/language-engine";
import {
  completeLanguageRewriteJob,
  failLanguageRewriteJob,
  markLanguageRewriteJobRunning,
  touchLanguageRewriteJobProgress,
} from "@/app/lib/language-rewrite-jobs";
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

export type LanguageRewriteRequestBody = {
  articleIds: string[];
  clientIds?: string[];
  providerMode?: LanguageProviderMode;
  journalistProfileId?: string;
  rewriteStyle?: string;
  journalistStyle?: string;
  editorialGuidelines?: string;
  contentStyle?: LanguageContentStyle;
  sportContext?: LanguageSportContext;
};

function profileForArticle(
  profiles: LanguageJournalistProfile[],
  article: { author?: string; sourceBrand: string },
  selectedId?: string,
): LanguageJournalistProfile | undefined {
  if (selectedId) return profiles.find((profile) => profile.id === selectedId && profile.active);
  const author = article.author?.trim().toLowerCase();
  if (!author) return undefined;
  return profiles.find(
    (profile) => profile.active && profile.brand === article.sourceBrand && profile.name.trim().toLowerCase() === author,
  );
}

export async function runLanguageRewriteJob(jobId: string, body: LanguageRewriteRequestBody): Promise<void> {
  console.info("[language-rewrite] start", { jobId, articleCount: body.articleIds.length });
  const heartbeat = setInterval(() => {
    void touchLanguageRewriteJobProgress(jobId, 0, "working");
  }, 15_000);

  try {
    await markLanguageRewriteJobRunning(jobId, "loading articles");
    const data = await readLanguageStudioData();
    const articles = body.articleIds
      .map((id) => data.articles[id])
      .filter((article): article is NonNullable<typeof article> => Boolean(article));
    if (articles.length === 0) {
      await failLanguageRewriteJob(jobId, "Article not found.");
      return;
    }

    const clientIds = Array.isArray(body.clientIds)
      ? [...new Set(body.clientIds.map((id) => String(id).trim()).filter((id) => Boolean(data.clients[id]?.active)))]
      : [];

    const now = new Date().toISOString();
    const rewrites: LanguageTranslation[] = [];

    for (let index = 0; index < articles.length; index++) {
      const sourceArticle = articles[index]!;
      const phase = `rewriting ${index + 1}/${articles.length}`;
      await touchLanguageRewriteJobProgress(jobId, index, phase);
      console.info("[language-rewrite]", { jobId, phase, articleId: sourceArticle.id });

      const article = {
        ...sourceArticle,
        body: stripArticleMetadataLines(sourceArticle.body, sourceArticle),
      };
      const glossary = Object.values(data.glossary).filter(
        (entry) => entry.brand === article.sourceBrand || entry.brand === "Global",
      );
      const rules = Object.values(data.rules).filter(
        (rule) => rule.brand === article.sourceBrand || rule.brand === "Global",
      );
      const profile = profileForArticle(Object.values(data.journalistProfiles), article, body.journalistProfileId);
      const journalistStyle =
        body.journalistStyle || (profile ? `${profile.name} (${profile.brand})\n${profile.styleNotes}` : undefined);
      const editorialGuidelines = body.editorialGuidelines || profile?.articleGuidelines;

      const fields = await translateContent({
        article,
        targetLanguage: article.sourceLanguage,
        providerMode: body.providerMode ?? "openai",
        translationMode: "rewrite-only",
        includeSocialPosts: false,
        rewriteStyle: body.rewriteStyle,
        journalistStyle,
        editorialGuidelines,
        contentStyle: body.contentStyle ?? contentStyleFromArticle(article),
        sportContext: body.sportContext ?? sportContextFromArticle(article, Object.values(data.sourceBrands)),
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
        clientIds,
        targetLanguage: article.sourceLanguage,
        providerMode: body.providerMode ?? "openai",
        translationMode: "rewrite-only",
        status: "draft",
        createdAt: now,
        updatedAt: now,
        editorNotes: [
          body.rewriteStyle ? `Style: ${body.rewriteStyle}` : "",
          journalistStyle ? `Journalist style: ${journalistStyle}` : "",
          `Content style: ${body.contentStyle ?? contentStyleFromArticle(article)}`,
          `Sport: ${body.sportContext ?? sportContextFromArticle(article, Object.values(data.sourceBrands))}`,
          editorialGuidelines ? `Guidelines: ${editorialGuidelines}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        ...fields,
        body: stripGeneratedArticleMetadataLines(fields.body, article, fields.title),
      };

      scheduleDeferredSocialPostsForTranslation(row.id);
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
    await completeLanguageRewriteJob(jobId, rewrites);
    console.info("[language-rewrite] completed", { jobId, rewriteCount: rewrites.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Rewrite failed.";
    console.error("[language-rewrite] failed", { jobId, message });
    await failLanguageRewriteJob(jobId, message);
  } finally {
    clearInterval(heartbeat);
  }
}
