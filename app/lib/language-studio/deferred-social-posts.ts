import { after } from "next/server";
import { generateSocialPosts } from "@/app/lib/language-studio/language-engine";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

/**
 * Generate platform social posts **after** the HTTP response is returned so the synchronous
 * function stays under Netlify gateway limits. The translation row is already persisted
 * (possibly with incomplete social posts); this pass fills them in and writes again.
 */
export function scheduleDeferredSocialPostsForTranslation(translationId: string): void {
  after(async () => {
    try {
      const data = await readLanguageStudioData();
      const row = data.translations[translationId];
      if (!row) return;
      const article = data.articles[row.articleId];
      if (!article) return;
      const posts = await generateSocialPosts({
        article,
        translation: row,
        knowledgeFiles: Object.values(data.knowledgeFiles),
      });
      const latest = await readLanguageStudioData();
      const t = latest.translations[translationId];
      if (!t) return;
      t.socialPosts = posts;
      t.updatedAt = new Date().toISOString();
      latest.translations[translationId] = t;
      await writeLanguageStudioData(latest);
    } catch (e) {
      console.error("[scheduleDeferredSocialPostsForTranslation]", translationId, e);
    }
  });
}
