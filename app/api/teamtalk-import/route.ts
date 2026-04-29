import { NextResponse } from "next/server";
import { fetchTeamtalkFeedItems, teamtalkFeedItemToImportedBundle } from "@/app/lib/teamtalk-feed";
import { newTemplateId, upsertUserTeamtalkNews } from "@/app/lib/user-templates-store";

type Body = { storyIds?: unknown };

/** Create tpl-* TEAMtalk News templates from selected feed story ids (re-fetches feed server-side). */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.storyIds;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "storyIds must be a non-empty array" }, { status: 400 });
  }

  const storyIds = raw
    .map((x) => (typeof x === "number" ? x : Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0) as number[];

  if (storyIds.length === 0) {
    return NextResponse.json({ error: "No valid story ids" }, { status: 400 });
  }

  try {
    const items = await fetchTeamtalkFeedItems();
    const byId = new Map(items.map((i) => [i.id, i]));
    const imports: { id: string; editorPath: string; headline: string }[] = [];
    const missing: number[] = [];

    for (const sid of storyIds) {
      const item = byId.get(sid);
      if (!item) {
        missing.push(sid);
        continue;
      }
      const id = newTemplateId();
      const bundle = teamtalkFeedItemToImportedBundle(item, id);
      await upsertUserTeamtalkNews(bundle);
      const headline = bundle.headlineLines.find((l) => l.trim()) ?? "Imported story";
      imports.push({ id, editorPath: `/editor/teamtalk-news/${id}`, headline });
    }

    return NextResponse.json({
      ok: true,
      imports,
      missingStoryIds: missing,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
