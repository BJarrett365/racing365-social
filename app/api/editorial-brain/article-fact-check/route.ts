import { NextResponse } from "next/server";
import { runArticleStudioFactCheck } from "@/app/lib/editorial-brain/article-fact-check";
import { storeArticleFactCheck, upsertEditorialLearningProposal } from "@/app/lib/editorial-brain/store";

export const dynamic = "force-dynamic";

type Body = {
  articleId?: string;
  translationId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const result = await runArticleStudioFactCheck({
      articleId: body.articleId,
      translationId: body.translationId,
    });
    const factCheck = await storeArticleFactCheck(result.factCheck);
    const proposals = [];
    for (const proposal of result.proposals) {
      proposals.push(await upsertEditorialLearningProposal(proposal));
    }
    return NextResponse.json({ factCheck, proposals });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Article fact-check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
