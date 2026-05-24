import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { importChartbeatCsv } from "@/app/lib/language-studio/chartbeat-import";
import { parseAuthorPageHtml } from "@/app/lib/language-studio/parse-author-page";
import type { LanguageArticle, LanguageJournalistProfile, LanguageStudioData } from "@/app/lib/language-studio/types";

const fixtureDir = path.join(process.cwd(), "app/lib/language-studio/__fixtures__");

function emptyStudio(): LanguageStudioData {
  return {
    sourceBrands: {},
    imports: {},
    articles: {},
    translations: {},
    glossary: {},
    rules: {},
    knowledgeFiles: {},
    journalistProfiles: {},
    guardrails: {},
    protectedTerms: {},
    marketRules: {},
    sportRules: {},
    promptRules: {},
    complianceNotes: {},
    translationMemory: {},
    qualityChecks: {},
    exports: {},
    auditLogs: {},
    clients: {},
    clientApiKeys: {},
    clientAccessLogs: {},
    cronJobs: {},
    cronRuns: {},
    articleAutomations: {},
    chartbeatImports: {},
    chartbeatPageStats: {},
    ignoredQualityIssueTypes: [],
  };
}

describe("parseAuthorPageHtml", () => {
  it("parses Football365 author page fixture", () => {
    const html = fs.readFileSync(path.join(fixtureDir, "f365-author-lewis-oldham.html"), "utf-8");
    const parsed = parseAuthorPageHtml(html, "https://www.football365.com/author/lewis-oldham", "Football365");
    expect(parsed.displayName).toBe("Lewis Oldham");
    expect(parsed.authorSlug).toBe("lewis-oldham");
    expect(parsed.bio).toContain("Premier League");
    expect(parsed.socialLinks.some((link) => link.platform === "x")).toBe(true);
    expect(parsed.articleTitles.length).toBeGreaterThan(0);
  });
});

describe("importChartbeatCsv", () => {
  it("matches articles and updates journalist performance scores", () => {
    const data = emptyStudio();
    const article: LanguageArticle = {
      id: "a1",
      importId: "i1",
      sourceBrand: "Football365",
      sourceLanguage: "en",
      tags: [],
      title: "Arsenal title hopes",
      standfirst: "",
      body: "Body",
      seoTitle: "Arsenal title hopes",
      metaDescription: "",
      slug: "arsenal-title-hopes",
      status: "imported",
      canonicalUrl: "https://www.football365.com/news/arsenal-title-race",
      author: "Joe Williams",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    };
    data.articles[article.id] = article;
    const profile: LanguageJournalistProfile = {
      id: "p1",
      name: "Joe Williams",
      brand: "Football365",
      sports: ["Football"],
      styleNotes: "Test",
      exampleTitles: [],
      sampleArticleIds: [],
      source: "imported",
      active: true,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    };
    data.journalistProfiles[profile.id] = profile;

    const csv = fs.readFileSync(path.join(fixtureDir, "chartbeat-sample.csv"), "utf-8");
    const result = importChartbeatCsv(data, { csvText: csv, brand: "Football365" });

    expect(result.matchedArticles).toBe(1);
    expect(result.profileUpdates).toBeGreaterThan(0);
    expect(data.journalistProfiles.p1?.stats?.performanceScore).toBeGreaterThan(0);
    expect(Object.keys(data.chartbeatImports).length).toBe(1);
  });
});
