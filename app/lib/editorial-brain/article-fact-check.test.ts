import { describe, expect, it } from "vitest";
import { buildArticleStudioFactCheck } from "@/app/lib/editorial-brain/article-fact-check";
import type { LanguageArticle, LanguageTranslation } from "@/app/lib/language-studio/types";

const article: LanguageArticle = {
  id: "article-1",
  importId: "import-1",
  sourceBrand: "Football365",
  sourceLanguage: "en",
  title: "Manchester United win at Brighton",
  standfirst: "United won 3-0 with Bruno Fernandes influential.",
  body: "<p>United won 3-0. Brighton had 54% possession. Bruno Fernandes said “We controlled the key moments”.</p>",
  tags: [],
  seoTitle: "",
  metaDescription: "",
  slug: "manchester-united-win-at-brighton",
  status: "imported",
  createdAt: "2026-05-26T00:00:00.000Z",
  updatedAt: "2026-05-26T00:00:00.000Z",
};

function translation(body: string): LanguageTranslation {
  return {
    id: "translation-1",
    articleId: article.id,
    targetLanguage: "en",
    providerMode: "openai",
    translationMode: "rewrite-only",
    title: "Manchester United win at Brighton",
    standfirst: "United won 3-0.",
    body,
    seoTitle: "Manchester United win at Brighton",
    metaDescription: "United won at Brighton.",
    tags: [],
    slug: "manchester-united-win-at-brighton",
    status: "review_needed",
    createdAt: "2026-05-26T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
  };
}

describe("buildArticleStudioFactCheck", () => {
  it("flags unsupported stats and creates a learning proposal", () => {
    const result = buildArticleStudioFactCheck(
      article,
      translation("<p>United won 3-0 after having 62% possession. Fernandes said “We controlled the key moments”.</p>"),
    );

    expect(result.factCheck.checks.some((check) => check.type === "stat" && check.status === "weak_evidence")).toBe(true);
    expect(result.factCheck.overallScore).toBeLessThan(90);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.approvalRequired).toBe(true);
    expect(result.proposals[0]?.evidence.length).toBeGreaterThan(1);
  });
});
