import { NextResponse } from "next/server";
import { generateSocialPosts } from "@/app/lib/language-studio/language-engine";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

type Body = {
  translationId?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data = await readLanguageStudioData();
  const translation = body.translationId ? data.translations[body.translationId] : undefined;
  if (!translation) return NextResponse.json({ error: "Translation not found." }, { status: 404 });

  const article = data.articles[translation.articleId];
  if (!article) return NextResponse.json({ error: "Source article not found." }, { status: 404 });

  const socialPosts = await generateSocialPosts({
    article,
    translation,
    knowledgeFiles: Object.values(data.knowledgeFiles),
  });

  if (socialPosts.length === 0) {
    return NextResponse.json({ error: "AI did not return social platform output." }, { status: 502 });
  }

  const next = {
    ...translation,
    socialPosts,
    updatedAt: new Date().toISOString(),
  };
  data.translations[next.id] = next;
  await writeLanguageStudioData(data);

  return NextResponse.json({ success: true, translation: next });
}
