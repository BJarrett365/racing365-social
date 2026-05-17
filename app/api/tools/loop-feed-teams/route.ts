import { NextResponse } from "next/server";
import { deleteLoopFeedTeam, readLoopFeedTeams, upsertLoopFeedTeam } from "@/app/lib/tools/loop-feed-teams-store";

export const dynamic = "force-dynamic";

/** GET — list Loop Feed teams for Tools + Data Studio dropdowns. */
export async function GET() {
  const teams = await readLoopFeedTeams();
  return NextResponse.json({ teams });
}

type PostBody = {
  name?: string;
  topicUrl?: string;
  active?: boolean;
};

/** POST — create team */
export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name : "";
  const topicUrl = typeof body.topicUrl === "string" ? body.topicUrl : "";
  if (!topicUrl.trim()) {
    return NextResponse.json({ ok: false, error: "topicUrl is required." }, { status: 400 });
  }
  try {
    const team = await upsertLoopFeedTeam({
      name,
      topicUrl,
      active: body.active !== false,
    });
    return NextResponse.json({ ok: true, team });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

type PatchBody = PostBody & { id?: string };

/** PATCH — update team */
export async function PATCH(req: Request) {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });

  const existing = (await readLoopFeedTeams()).find((t) => t.id === id);
  if (!existing) return NextResponse.json({ ok: false, error: "Team not found." }, { status: 404 });

  const name = typeof body.name === "string" ? body.name : existing.name;
  const topicUrl = typeof body.topicUrl === "string" ? body.topicUrl : existing.topicUrl;
  const active = typeof body.active === "boolean" ? body.active : existing.active;

  try {
    const team = await upsertLoopFeedTeam({ id, name, topicUrl, active });
    return NextResponse.json({ ok: true, team });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

/** DELETE — body { id } */
export async function DELETE(req: Request) {
  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
  const ok = await deleteLoopFeedTeam(id);
  if (!ok) return NextResponse.json({ ok: false, error: "Team not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
