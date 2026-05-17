import { NextResponse } from "next/server";
import { slugifyArticleTitle, splitArticleForLanguageStudio } from "@/app/lib/data-studio/markdown-to-article";
import { newLanguageId, readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import { uniqueTags } from "@/app/lib/language-studio/tags";
import {
  LANGUAGE_SPORT_CONTEXTS,
  type LanguageArticle,
  type LanguageImport,
  type LanguageSportContext,
} from "@/app/lib/language-studio/types";

export const dynamic = "force-dynamic";

type Body = {
  markdown?: string;
  mode?: string;
  sourceBrand?: string;
  sport?: string;
  journalistProfileId?: string;
  sport_id?: string;
  match_id?: string;
  clientIds?: string[];
};

function sportFromBody(raw: unknown): LanguageSportContext | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return LANGUAGE_SPORT_CONTEXTS.includes(raw as LanguageSportContext) ? (raw as LanguageSportContext) : undefined;
}

/**
 * POST /api/data-studio/language-publish
 * Saves AI output (WordPress HTML fragment or Markdown) as a Language Studio source article (status imported).
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const markdown = typeof body.markdown === "string" ? body.markdown.trim() : "";
  if (!markdown) {
    return NextResponse.json({ ok: false, error: "markdown is required." }, { status: 400 });
  }

  const sourceBrand = typeof body.sourceBrand === "string" ? body.sourceBrand.trim() : "";
  if (!sourceBrand) {
    return NextResponse.json({ ok: false, error: "sourceBrand is required (e.g. Football365)." }, { status: 400 });
  }

  const mode =
    body.mode === "preview" || body.mode === "report" || body.mode === "sixteen_conclusions" ? body.mode : "report";
  let sport = sportFromBody(body.sport);
  const sportId = typeof body.sport_id === "string" ? body.sport_id.trim() : "";
  if (!sport && sportId === "1") sport = "Football";

  const data = await readLanguageStudioData();
  const now = new Date().toISOString();

  let author = "Data Studio";
  const profileId = typeof body.journalistProfileId === "string" ? body.journalistProfileId.trim() : "";
  if (profileId) {
    const profile = data.journalistProfiles[profileId];
    if (profile?.active) author = profile.name.trim() || author;
  }

  const clientIdsRaw = Array.isArray(body.clientIds) ? body.clientIds.map((id) => String(id).trim()).filter(Boolean) : [];
  const clientIds = [...new Set(clientIdsRaw)].filter((id) => data.clients[id]?.active);

  const parsed = splitArticleForLanguageStudio(markdown);
  const matchId = typeof body.match_id === "string" ? body.match_id.trim() : "";

  const articleId = newLanguageId("larticle");
  const importId = newLanguageId("limport");
  const slugBase = slugifyArticleTitle(parsed.title) || slugifyArticleTitle(`match-${matchId || articleId.slice(-8)}`);

  const sourceUrl =
    sportId && matchId
      ? `https://datafeed.sixlogics.com/api/SportccFixture?sport_id=${encodeURIComponent(sportId)}&match_id=${encodeURIComponent(matchId)}`
      : undefined;

  const tags = uniqueTags([
    "data-studio",
    `data-studio-${mode}`,
    ...(sportId ? [`sport-${sportId}`] : []),
    ...(matchId ? [`match-${matchId}`] : []),
  ]);

  const category =
    mode === "preview" ? "Preview" : mode === "sixteen_conclusions" ? "16 Conclusions" : "Match report";

  const article: LanguageArticle = {
    id: articleId,
    importId,
    sourceBrand,
    sourceLanguage: "en",
    ...(clientIds.length ? { clientIds } : {}),
    sourceUrl,
    canonicalUrl: sourceUrl,
    sourceArticleId: `data-studio-${mode}-${matchId || "unknown"}-${articleId.slice(-10)}`,
    author,
    /** Full ISO instant so Rewrite lists show distinct times (date-only strings parse as UTC midnight and every article that day shows the same clock time). */
    publishDate: now,
    modifiedDate: "",
    category,
    tags,
    title: parsed.title,
    standfirst: parsed.standfirst,
    body: parsed.body,
    socialEmbeds: [],
    seoTitle: parsed.title.slice(0, 120),
    metaDescription: parsed.standfirst.slice(0, 180) || parsed.title.slice(0, 180),
    slug: slugBase || articleId,
    status: "imported",
    ...(sport ? { sport } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const importRow: LanguageImport = {
    id: importId,
    sourceBrand,
    sourceLanguage: "en",
    ...(clientIds.length ? { clientIds } : {}),
    sourceUrl,
    title: `Data Studio · ${parsed.title}`,
    articleIds: [articleId],
    createdAt: now,
  };

  data.imports[importId] = importRow;
  data.articles[articleId] = article;

  const auditId = newLanguageId("laudit");
  data.auditLogs[auditId] = {
    id: auditId,
    entityType: "language_article",
    entityId: articleId,
    action: "data_studio_publish",
    detail: `Imported ${mode} from Data Studio · brand ${sourceBrand}${matchId ? ` · match ${matchId}` : ""}`,
    createdAt: now,
  };

  await writeLanguageStudioData(data);

  return NextResponse.json({
    ok: true,
    articleId,
    importId,
    title: article.title,
  });
}
