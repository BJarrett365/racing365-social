import Link from "next/link";
import { R365Button } from "@/app/components/R365Button";
import { YouTubeTranscriptsClient } from "@/app/article-studio/youtube-transcripts/YouTubeTranscriptsClient";
import { BRAND_SUITE } from "@/app/lib/brand";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import { listYouTubeScriptImports } from "@/app/lib/youtube-script/storage";

export const metadata = {
  title: `YouTube Transcripts · Article Studio · ${BRAND_SUITE}`,
};

export default async function ArticleStudioYouTubeTranscriptsPage() {
  const [imports, languageData] = await Promise.all([
    listYouTubeScriptImports(),
    readLanguageStudioData(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Article Studio</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">
            YouTube Transcripts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Saved YouTube scripts appear here before moving through Rewrite and Translations. The original script is
            treated as source material at the top of the article record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tools/youtube-script-importer">
            <R365Button>Import YouTube Script</R365Button>
          </Link>
          <Link href="/article-studio">
            <R365Button variant="ghost">Back to Article Studio</R365Button>
          </Link>
        </div>
      </div>

      <YouTubeTranscriptsClient initialImports={imports} importedArticleCount={Object.keys(languageData.articles).length} />
    </div>
  );
}
