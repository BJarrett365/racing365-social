export const LANGUAGE_LABELS = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  nl: "Dutch",
  ar: "Arabic",
  ja: "Japanese",
  zh: "Chinese",
  pl: "Polish",
  tr: "Turkish",
  ro: "Romanian",
  el: "Greek",
  cs: "Czech",
  af: "Afrikaans",
  zu: "Zulu",
  da: "Danish",
  fi: "Finnish",
  xh: "Xhosa",
} as const;

export type LanguageCode = keyof typeof LANGUAGE_LABELS;

export type LanguageProviderMode = "openai" | "deepl" | "deepl-openai";

export type TranslationMode =
  | "translate-only"
  | "translate-localise"
  | "translate-rewrite"
  | "rewrite-only"
  | "headline-only"
  | "seo-only"
  | "summary-only";

export type LanguageContentStyle = "News" | "Transfer" | "Opinion" | "Preview" | "Review" | "Analysis" | "Feature" | "Live";

export type LanguageSportContext =
  | "Football"
  | "Horse Racing"
  | "Rugby Union"
  | "Rugby League"
  | "Formula 1"
  | "Cricket"
  | "Golf"
  | "Tennis"
  | "NFL"
  | "Boxing"
  | "MMA"
  | "Basketball";

export type LanguageSourceParserType = "rss-default" | "wordpress-rss" | "json-api" | "html-page" | "custom";

export type LanguageSourceBrand = {
  id: string;
  name: string;
  feedUrl: string;
  sourceLanguage: LanguageCode;
  parserType: LanguageSourceParserType;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageWorkflowStatus = "imported" | "translating" | "translated" | "review_needed" | "approved" | "rejected" | "exported" | "failed" | "archived";
export type LanguageArticleStatus = LanguageWorkflowStatus | "queued";

export type LanguageSocialEmbed = {
  id: string;
  provider: "x" | "instagram" | "youtube" | "tiktok" | "facebook" | "threads" | "unknown";
  marker: string;
  url?: string;
  originalText: string;
  translatedText?: string;
  author?: string;
  handle?: string;
  publishedAt?: string;
  position: number;
};

export type LanguageSocialPlatform = "appAlerts" | "facebook" | "x" | "instagram" | "youtube" | "tiktok" | "whatsapp" | "telegram";

export type LanguageSocialPost = {
  platform: LanguageSocialPlatform;
  text: string;
  headline?: string;
  hashtags?: string[];
  callToAction?: string;
};

export type LanguageImport = {
  id: string;
  sourceBrand: string;
  sourceLanguage: LanguageCode;
  sourceUrl?: string;
  title: string;
  articleIds: string[];
  createdAt: string;
};

export type LanguageArticle = {
  id: string;
  importId: string;
  sourceBrand: string;
  sourceLanguage: LanguageCode;
  sourceUrl?: string;
  canonicalUrl?: string;
  sourceArticleId?: string;
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  category?: string;
  tags: string[];
  imageUrl?: string;
  imageLibraryRel?: string;
  title: string;
  standfirst: string;
  body: string;
  socialEmbeds?: LanguageSocialEmbed[];
  socialPosts?: LanguageSocialPost[];
  seoTitle: string;
  metaDescription: string;
  slug: string;
  status: LanguageArticleStatus;
  createdAt: string;
  updatedAt: string;
};

export type LanguageTranslation = {
  id: string;
  articleId: string;
  targetLanguage: LanguageCode;
  providerMode: LanguageProviderMode;
  translationMode: TranslationMode;
  title: string;
  standfirst: string;
  body: string;
  socialEmbeds?: LanguageSocialEmbed[];
  socialPosts?: LanguageSocialPost[];
  seoTitle: string;
  metaDescription: string;
  tags: string[];
  slug: string;
  status: "draft" | "review_needed" | "approved" | "rejected" | "exported" | "failed";
  warnings?: string[];
  confidenceScore?: number;
  guardrailFlags?: string[];
  editorNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
};

export type LanguageGuardrailCategory = "fact-safety" | "translation-safety" | "editorial-safety" | "seo-safety" | "compliance-safety" | "rights-safety";
export type LanguageGuardrailSeverity = "green" | "amber" | "red";

export type LanguageGuardrail = {
  id: string;
  category: LanguageGuardrailCategory;
  title: string;
  rule: string;
  severity: LanguageGuardrailSeverity;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LanguageProtectedTerm = {
  id: string;
  term: string;
  type: "driver" | "team" | "race" | "sponsor" | "person" | "place" | "technical term";
  doNotTranslate: boolean;
  approvedVariants: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageMarketRule = {
  id: string;
  market: string;
  language: LanguageCode;
  locale: string;
  direction: "ltr" | "rtl";
  seoKeywordRules: string;
  toneRules: string;
  spellingRules: string;
  headlineStyleNotes: string;
  seoNotes: string;
  dateFormat: string;
  timeFormat: string;
  currencyFormat: string;
  complianceNotes: string;
  fallbackProvider: LanguageProviderMode;
  createdAt: string;
  updatedAt: string;
};

export type LanguageSportRule = {
  id: string;
  sport: string;
  keyTerms: string[];
  dataRules: string;
  protectedStats: string[];
  namingConventions: string;
  examples: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguagePromptRule = {
  id: string;
  language?: LanguageCode | "";
  contentType: string;
  promptInstruction: string;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LanguageComplianceNote = {
  id: string;
  market: string;
  riskType: string;
  rule: string;
  action: string;
  escalationRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LanguageTranslationMemory = {
  id: string;
  sourceText: string;
  approvedTranslation: string;
  language: LanguageCode;
  brand: string;
  market?: string;
  editor?: string;
  dateApproved: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LanguageQualityCheckIssue = {
  id: string;
  type:
    | "missing-title"
    | "missing-body"
    | "changed-numbers"
    | "changed-quotes"
    | "untranslated-blocks"
    | "protected-terms-changed"
    | "seo-title-too-long"
    | "meta-description-too-long"
    | "slug-missing"
    | "possible-hallucination"
    | "risk-terms-found"
    | "compliance-flags-found";
  severity: LanguageGuardrailSeverity;
  message: string;
  suggestedFix?: string;
  ignored?: boolean;
  escalated?: boolean;
};

export type LanguageQualityCheck = {
  id: string;
  translationId: string;
  articleId: string;
  score: LanguageGuardrailSeverity;
  issues: LanguageQualityCheckIssue[];
  overrideBy?: string;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageGlossaryEntry = {
  id: string;
  brand: string;
  sourceTerm: string;
  targetLanguage?: LanguageCode | "";
  targetTerm?: string;
  protected: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageRule = {
  id: string;
  brand: string;
  targetLanguage?: LanguageCode | "";
  market?: string;
  fieldType?: string;
  title: string;
  rule: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageKnowledgeFile = {
  id: string;
  title: string;
  kind: "brand-glossary" | "protected-terms" | "f1-terminology" | "tone-rules" | "seo-rules" | "compliance" | "prompt" | "journalist-style" | "quality-fix" | "social-platform";
  language?: LanguageCode | "";
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageJournalistProfile = {
  id: string;
  name: string;
  brand: string;
  sports: string[];
  styleNotes: string;
  articleGuidelines?: string;
  exampleTitles: string[];
  sampleArticleIds: string[];
  source: "imported" | "manual";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LanguageExport = {
  id: string;
  translationId: string;
  articleId: string;
  targetLanguage: LanguageCode;
  format: "xml" | "json";
  payload: string;
  createdAt: string;
};

export type LanguageAuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  detail?: string;
  createdAt: string;
};

export type LanguageClient = {
  id: string;
  name: string;
  contactEmail?: string;
  active: boolean;
  allowedBrands: string[];
  allowedLanguages: LanguageCode[];
  allowedFormats: Array<"xml" | "json">;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LanguageClientApiKey = {
  id: string;
  clientId: string;
  label: string;
  keyHash: string;
  keyPrefix: string;
  active: boolean;
  allowedBrands: string[];
  allowedLanguages: LanguageCode[];
  allowedFormats: Array<"xml" | "json">;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

export type LanguageClientAccessLog = {
  id: string;
  clientId: string;
  apiKeyId: string;
  format: "xml" | "json";
  path: string;
  status: number;
  detail?: string;
  createdAt: string;
};

export type LanguageStudioData = {
  sourceBrands: Record<string, LanguageSourceBrand>;
  imports: Record<string, LanguageImport>;
  articles: Record<string, LanguageArticle>;
  translations: Record<string, LanguageTranslation>;
  glossary: Record<string, LanguageGlossaryEntry>;
  rules: Record<string, LanguageRule>;
  knowledgeFiles: Record<string, LanguageKnowledgeFile>;
  journalistProfiles: Record<string, LanguageJournalistProfile>;
  guardrails: Record<string, LanguageGuardrail>;
  protectedTerms: Record<string, LanguageProtectedTerm>;
  marketRules: Record<string, LanguageMarketRule>;
  sportRules: Record<string, LanguageSportRule>;
  promptRules: Record<string, LanguagePromptRule>;
  complianceNotes: Record<string, LanguageComplianceNote>;
  translationMemory: Record<string, LanguageTranslationMemory>;
  qualityChecks: Record<string, LanguageQualityCheck>;
  exports: Record<string, LanguageExport>;
  auditLogs: Record<string, LanguageAuditLog>;
  clients: Record<string, LanguageClient>;
  clientApiKeys: Record<string, LanguageClientApiKey>;
  clientAccessLogs: Record<string, LanguageClientAccessLog>;
};

export type LanguageSettings = {
  providerMode: LanguageProviderMode;
  openaiModel: string;
  deeplApiKey?: string;
  deeplApiUrl?: string;
};
