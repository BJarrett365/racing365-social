import { NextResponse } from "next/server";
import { journalistIdentityKey, normalizeAuthorIdentity } from "@/app/lib/language-studio/author-identity";
import { recomputeJournalistStats } from "@/app/lib/language-studio/journalist-stats";
import { syncJournalistKnowledgeFile } from "@/app/lib/language-studio/journalist-knowledge-sync";
import { fetchAndParseAuthorPage } from "@/app/lib/language-studio/parse-author-page";
import { newLanguageId, readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";

type Body = {
  url?: string;
  brand?: string;
};

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const url = body?.url?.trim();
  const brand = body?.brand?.trim();
  if (!url || !brand) {
    return NextResponse.json({ error: "url and brand are required." }, { status: 400 });
  }

  const parsed = await fetchAndParseAuthorPage(url, brand);
  const identity = normalizeAuthorIdentity(parsed.displayName, brand) ?? normalizeAuthorIdentity(url, brand);
  if (!identity) {
    return NextResponse.json({ error: "Could not resolve author identity from page." }, { status: 400 });
  }

  const data = await readLanguageStudioData();
  const key = journalistIdentityKey(brand, identity);
  const now = new Date().toISOString();
  const existing = Object.values(data.journalistProfiles).find((profile) => {
    const id = normalizeAuthorIdentity(profile.name, profile.brand);
    return id ? journalistIdentityKey(profile.brand, id) === key : false;
  });

  const profile: LanguageJournalistProfile = {
    id: existing?.id ?? newLanguageId("ljournalist"),
    name: parsed.displayName || identity.displayName,
    brand,
    sports: existing?.sports ?? [],
    styleNotes: existing?.styleNotes?.trim() || `Imported author profile from ${parsed.authorPageUrl}.`,
    articleGuidelines: existing?.articleGuidelines,
    teamSupportMode: existing?.teamSupportMode,
    supportedClub: existing?.supportedClub,
    authorSlug: parsed.authorSlug,
    authorPageUrl: parsed.authorPageUrl,
    bio: parsed.bio,
    avatarUrl: parsed.avatarUrl,
    socialLinks: parsed.socialLinks,
    aliases: uniqueStrings([...(existing?.aliases ?? []), ...identity.aliases, parsed.displayName]),
    exampleTitles: uniqueStrings([...(existing?.exampleTitles ?? []), ...parsed.articleTitles]).slice(0, 12),
    sampleArticleIds: existing?.sampleArticleIds ?? [],
    stats: existing?.stats ?? { importedArticleCount: 0, exportedArticleCount: 0, socialPostCount: 0 },
    source: existing?.source ?? "imported",
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  data.journalistProfiles[profile.id] = profile;
  recomputeJournalistStats(data, profile.id);
  syncJournalistKnowledgeFile(data, data.journalistProfiles[profile.id]!);
  await writeLanguageStudioData(data);

  return NextResponse.json({ success: true, profile: data.journalistProfiles[profile.id] });
}
