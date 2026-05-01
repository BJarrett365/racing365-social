import { newLanguageId } from "@/app/lib/language-studio/store";
import type {
  LanguageArticle,
  LanguageProtectedTerm,
  LanguageQualityCheck,
  LanguageQualityCheckIssue,
  LanguageTranslation,
} from "@/app/lib/language-studio/types";

function numbers(text: string): string[] {
  return text.match(/\b\d+(?:[.,:]\d+)*(?:%|s|m|am|pm)?\b/gi) ?? [];
}

function quotedBlocks(text: string): string[] {
  return text.match(/"[^"]+"|'[^']+'|“[^”]+”|‘[^’]+’/g) ?? [];
}

function includesTerm(text: string, term: string): boolean {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text);
}

function stableIssueId(type: LanguageQualityCheckIssue["type"], message: string): string {
  let hash = 0;
  for (let index = 0; index < message.length; index += 1) {
    hash = (hash * 31 + message.charCodeAt(index)) >>> 0;
  }
  return `lqissue-${type}-${hash.toString(36)}`;
}

function issueKey(issue: Pick<LanguageQualityCheckIssue, "type" | "message">): string {
  return `${issue.type}::${issue.message}`;
}

function issue(type: LanguageQualityCheckIssue["type"], severity: LanguageQualityCheckIssue["severity"], message: string, suggestedFix?: string): LanguageQualityCheckIssue {
  return { id: stableIssueId(type, message), type, severity, message, suggestedFix };
}

function scoreForIssues(issues: LanguageQualityCheckIssue[]): LanguageQualityCheck["score"] {
  const activeIssues = issues.filter((row) => !row.ignored);
  return activeIssues.some((row) => row.severity === "red") ? "red" : activeIssues.some((row) => row.severity === "amber") ? "amber" : "green";
}

export function applyStoredQualityDecisions(
  check: LanguageQualityCheck,
  previousChecks: LanguageQualityCheck[],
): LanguageQualityCheck {
  const decisions = new Map<string, Pick<LanguageQualityCheckIssue, "ignored">>();
  for (const previous of previousChecks) {
    if (previous.translationId !== check.translationId) continue;
    for (const previousIssue of previous.issues) {
      if (!previousIssue.ignored) continue;
      decisions.set(issueKey(previousIssue), {
        ignored: previousIssue.ignored,
      });
    }
  }

  const issues = check.issues.map((row) => ({ ...row, ...decisions.get(issueKey(row)) }));
  return {
    ...check,
    score: scoreForIssues(issues),
    issues,
  };
}

export function runLanguageQualityChecks(
  article: LanguageArticle,
  translation: LanguageTranslation,
  protectedTerms: LanguageProtectedTerm[],
): LanguageQualityCheck {
  const issues: LanguageQualityCheckIssue[] = [];
  const sourceNumbers = numbers([article.title, article.standfirst, article.body].join("\n"));
  const translatedNumbers = numbers([translation.title, translation.standfirst, translation.body].join("\n"));
  const sourceQuotes = quotedBlocks(article.body);
  const translatedQuotes = quotedBlocks(translation.body);

  if (!translation.title.trim()) issues.push(issue("missing-title", "red", "Translated title is missing.", "Add a translated title."));
  if (!translation.body.trim()) issues.push(issue("missing-body", "red", "Translated body is missing.", "Add translated body copy."));
  if (!translation.slug.trim()) issues.push(issue("slug-missing", "amber", "Slug is missing.", "Create a short, clean slug."));
  if (translation.seoTitle.length > 70) issues.push(issue("seo-title-too-long", "amber", "SEO title is longer than recommended.", "Shorten SEO title to around 60 characters."));
  if (translation.metaDescription.length > 170) issues.push(issue("meta-description-too-long", "amber", "Meta description is longer than recommended.", "Shorten meta description to around 160 characters."));
  if (sourceNumbers.some((value) => !translatedNumbers.includes(value))) {
    issues.push(issue("changed-numbers", "red", "One or more source numbers are missing or changed in the translation.", "Check race results, dates, standings and statistics."));
  }
  if (sourceQuotes.length !== translatedQuotes.length) {
    issues.push(issue("changed-quotes", "red", "Quote count changed between source and translation.", "Preserve every quote boundary and attribution."));
  }
  for (const term of protectedTerms.filter((row) => row.doNotTranslate)) {
    if (includesTerm(article.body, term.term) && !includesTerm(translation.body, term.term) && !term.approvedVariants.some((variant) => includesTerm(translation.body, variant))) {
      issues.push(issue("protected-terms-changed", "red", `Protected term changed or missing: ${term.term}`, `Restore "${term.term}" or an approved variant.`));
    }
  }
  if (/\[\[[A-Z_]+:/.test(article.body) && !/\[\[[A-Z_]+:/.test(translation.body)) {
    issues.push(issue("untranslated-blocks", "red", "Structured block marker is missing from the translated body.", "Restore social embed or protected block markers."));
  }
  if (translation.body.length > article.body.length * 1.9 && article.body.length > 200) {
    issues.push(issue("possible-hallucination", "amber", "Translation is much longer than source and may include unsupported additions.", "Review for added reporting or opinion."));
  }
  const riskTerms = /\b(bet|betting|odds|injury|medical|lawsuit|legal|defamatory|exclusive image|copyright|likeness|voice clone)\b/i;
  if (riskTerms.test([article.body, translation.body].join("\n"))) {
    issues.push(issue("risk-terms-found", "amber", "Potential compliance risk terms found.", "Review betting, legal, medical, media rights or likeness wording."));
    issues.push(issue("compliance-flags-found", "amber", "Compliance review may be required.", "Escalate if the claim is legal, medical, defamatory, rights-based or betting related."));
  }

  const now = new Date().toISOString();
  return {
    id: newLanguageId("lquality"),
    articleId: article.id,
    translationId: translation.id,
    score: scoreForIssues(issues),
    issues,
    createdAt: now,
    updatedAt: now,
  };
}
