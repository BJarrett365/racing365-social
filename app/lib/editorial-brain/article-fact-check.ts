import { newLanguageId, readLanguageStudioData } from "@/app/lib/language-studio/store";
import type {
  ArticleFactCheck,
  ArticleFactCheckClaim,
  ArticleStudioScore,
  EditorialLearningProposal,
  LanguageArticle,
  LanguageTranslation,
} from "@/app/lib/language-studio/types";

type ArticleFactCheckInput = {
  articleId?: string;
  translationId?: string;
};

const FACT_CHECK_PRIORITIES = {
  stat: 1,
  quote: 2,
  transfer_status: 3,
  name: 4,
  club: 5,
  date: 6,
  competition: 7,
} as const;

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function articleText(article: LanguageArticle): string {
  return [article.title, article.standfirst, stripHtml(article.body)].filter(Boolean).join("\n");
}

function outputText(article: LanguageArticle, translation?: LanguageTranslation): string {
  if (!translation) return articleText(article);
  return [translation.title, translation.standfirst, stripHtml(translation.body)].filter(Boolean).join("\n");
}

function numbers(text: string): string[] {
  return [...new Set(text.match(/\b\d+(?:[.,:]\d+)*(?:%|m|bn|am|pm)?\b/gi) ?? [])];
}

function quotes(text: string): string[] {
  return text.match(/"[^"]+"|'[^']+'|“[^”]+”|‘[^’]+’/g) ?? [];
}

function likelyNames(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) ?? [];
  const blocked = new Set(["Premier League", "Article Studio", "Language Studio"]);
  return [...new Set(matches.filter((name) => !blocked.has(name)))].slice(0, 80);
}

function containsLoose(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return `${prefix}-${hash.toString(36)}`;
}

function claim(
  type: ArticleFactCheckClaim["type"],
  claimText: string,
  status: ArticleFactCheckClaim["status"],
  confidence: number,
  evidence: string[],
  suggestion?: string,
): ArticleFactCheckClaim {
  return {
    id: stableId(`afclaim-${type}`, `${claimText}-${status}`),
    type,
    claim: claimText,
    status,
    source: "Plexa source article and protected editorial memory",
    confidence,
    evidence,
    suggestion,
  };
}

function checkNumbers(source: string, output: string): ArticleFactCheckClaim[] {
  const sourceNumbers = numbers(source);
  const outputNumbers = numbers(output);
  const checks: ArticleFactCheckClaim[] = [];
  for (const value of outputNumbers) {
    if (sourceNumbers.includes(value)) {
      checks.push(claim("stat", `Number/stat preserved: ${value}`, "verified", 92, [`${value} appears in source and output.`]));
    } else {
      checks.push(
        claim(
          "stat",
          `Number/stat needs verification: ${value}`,
          "weak_evidence",
          68,
          [`${value} appears in output but not in the source article.`],
          "Verify this number against Tier 1 data or remove it.",
        ),
      );
    }
  }
  return checks;
}

function checkQuotes(source: string, output: string): ArticleFactCheckClaim[] {
  const sourceQuotes = quotes(source);
  const outputQuotes = quotes(output);
  const checks: ArticleFactCheckClaim[] = [];
  for (const value of outputQuotes) {
    if (sourceQuotes.includes(value)) {
      checks.push(claim("quote", `Quote preserved: ${value.slice(0, 120)}`, "verified", 94, ["Exact quote appears in source and output."]));
    } else {
      checks.push(
        claim(
          "quote",
          `Quote requires attribution: ${value.slice(0, 120)}`,
          "weak_evidence",
          62,
          ["Quote appears in output but not as an exact source quote."],
          "Confirm source attribution or convert to paraphrase.",
        ),
      );
    }
  }
  if (sourceQuotes.length > outputQuotes.length) {
    checks.push(
      claim(
        "quote",
        "One or more source quotes may be missing",
        "weak_evidence",
        70,
        [`Source has ${sourceQuotes.length} quote(s); output has ${outputQuotes.length}.`],
        "Review whether important quotes were dropped.",
      ),
    );
  }
  return checks;
}

function checkNames(source: string, output: string): ArticleFactCheckClaim[] {
  const sourceNames = likelyNames(source);
  const outputNames = likelyNames(output);
  return outputNames
    .filter((name) => !sourceNames.some((sourceName) => sourceName === name || containsLoose(sourceName, name) || containsLoose(name, sourceName)))
    .slice(0, 10)
    .map((name) =>
      claim(
        "name",
        `Name requires verification: ${name}`,
        "weak_evidence",
        64,
        [`${name} appears in output but was not found in source text.`],
        "Check spelling, club/team association and source support.",
      ),
    );
}

function checkTransferStatus(output: string): ArticleFactCheckClaim[] {
  const transferRisk = /\b(done deal|completed transfer|has signed|will sign|agreement reached|medical booked|here we go)\b/i;
  if (!transferRisk.test(output)) return [];
  return [
    claim(
      "transfer_status",
      "Transfer status claim requires source-strength review",
      "weak_evidence",
      66,
      ["Output contains high-risk transfer-status wording."],
      "Confirm with trusted source or soften wording to attributed reporting.",
    ),
  ];
}

function grade(overall: number): ArticleStudioScore["grade"] {
  if (overall >= 90) return "publish";
  if (overall >= 75) return "review";
  if (overall >= 60) return "needs_edits";
  return "reject";
}

function scoreArticle(checks: ArticleFactCheckClaim[], translation?: LanguageTranslation): ArticleStudioScore {
  const conflicts = checks.filter((check) => check.status === "conflict_found").length;
  const weak = checks.filter((check) => check.status === "weak_evidence").length;
  const factualAccuracy = Math.max(0, 30 - conflicts * 12 - weak * 4);
  const sourceQuality = Math.max(0, 20 - weak * 2);
  const brandFit = 12;
  const creatorFit = 8;
  const originality = 8;
  const body = translation?.body ?? "";
  const readability = body.length > 4000 ? 8 : 10;
  const seoSocialReadiness = translation?.seoTitle && translation.metaDescription ? 5 : 3;
  const overall = factualAccuracy + sourceQuality + brandFit + creatorFit + originality + readability + seoSocialReadiness;
  return {
    overall,
    grade: grade(overall),
    dimensions: {
      factualAccuracy,
      sourceQuality,
      brandFit,
      creatorFit,
      originality,
      readability,
      seoSocialReadiness,
    },
    summary:
      weak || conflicts
        ? "Article needs editorial review before approval; verify weak claims and unsupported quotes."
        : "Article passed the first Article Studio fact-check pass.",
  };
}

function proposalFromWeakChecks(params: {
  article: LanguageArticle;
  translation?: LanguageTranslation;
  factCheckId: string;
  checks: ArticleFactCheckClaim[];
}): EditorialLearningProposal | null {
  const weak = params.checks.filter((check) => check.status === "weak_evidence" || check.status === "conflict_found");
  if (!weak.length) return null;
  const quoteOrStat = weak.find((check) => check.type === "quote" || check.type === "stat") ?? weak[0];
  const now = new Date().toISOString();
  return {
    id: newLanguageId("elprop"),
    type: "factcheck",
    title: quoteOrStat.type === "quote" ? "Tighten quote attribution checks" : "Verify factual claims against source data",
    summary: "Article Studio detected weak evidence. Learn the correction pattern, not the incorrect claim.",
    confidence: Math.max(75, Math.min(95, quoteOrStat.confidence + 10)),
    evidence: [
      `Article: ${params.article.title}`,
      `${weak.length} weak/conflicting claim(s) found`,
      ...weak.slice(0, 3).map((check) => `${check.type}: ${check.claim}`),
    ],
    before: "Article output can contain unsupported factual or quote claims after generation.",
    after:
      quoteOrStat.type === "quote"
        ? "Quotes must be present in the source or explicitly attributed to a trusted external source."
        : "Stats, names and transfer-status claims must be verified against source text or Tier 1 data before approval.",
    impact: "Expected reduction in factual risk and editor correction time.",
    approvalRequired: true,
    proposedChanges: {
      rule:
        quoteOrStat.type === "quote"
          ? "Quote claims require exact source support or attribution."
          : "Factual claims require source support; weak evidence must be flagged before approval.",
      issueTypes: [...new Set(weak.map((check) => check.type))],
    },
    targetEntityType: "qualityCheck",
    sourceArticleId: params.article.id,
    sourceTranslationId: params.translation?.id,
    sourceFactCheckId: params.factCheckId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export function buildArticleStudioFactCheck(article: LanguageArticle, translation?: LanguageTranslation): {
  factCheck: ArticleFactCheck;
  proposals: EditorialLearningProposal[];
} {
  const source = articleText(article);
  const output = outputText(article, translation);
  const checks = [
    ...checkNumbers(source, output),
    ...checkQuotes(source, output),
    ...checkTransferStatus(output),
    ...checkNames(source, output),
  ].sort((a, b) => FACT_CHECK_PRIORITIES[a.type] - FACT_CHECK_PRIORITIES[b.type]);
  const score = scoreArticle(checks, translation);
  const id = newLanguageId("afcheck");
  const now = new Date().toISOString();
  const proposals = [proposalFromWeakChecks({ article, translation, factCheckId: id, checks })].filter(
    (proposal): proposal is EditorialLearningProposal => Boolean(proposal),
  );
  const factCheck: ArticleFactCheck = {
    id,
    articleId: article.id,
    translationId: translation?.id,
    overallScore: score.overall,
    score,
    checks,
    learningProposalIds: proposals.map((proposal) => proposal.id),
    checkedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return { factCheck, proposals };
}

export async function runArticleStudioFactCheck(input: ArticleFactCheckInput): Promise<{
  factCheck: ArticleFactCheck;
  proposals: EditorialLearningProposal[];
}> {
  const data = await readLanguageStudioData();
  const translation = input.translationId ? data.translations[input.translationId] : undefined;
  const articleId = input.articleId ?? translation?.articleId;
  if (!articleId) throw new Error("articleId or translationId is required.");
  const article = data.articles[articleId];
  if (!article) throw new Error("Article not found.");
  if (input.translationId && !translation) throw new Error("Translation not found.");

  return buildArticleStudioFactCheck(article, translation);
}
