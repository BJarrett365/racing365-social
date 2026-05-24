import { NextResponse } from "next/server";
import type { SportVerticalId } from "@/app/lib/data-studio/types";
import {
  normalizeReporterAffiliationScope,
  normalizeReporterOutlet,
  normalizeReporterPriority,
  normalizeReporterRoleCategory,
  normalizeReporterTeamName,
  normalizeReporterWeight,
} from "@/app/lib/tools/loop-feed-priority-reporters-shared";
import {
  deleteLoopFeedPriorityReporter,
  readLoopFeedPriorityReporters,
  upsertLoopFeedPriorityReporter,
} from "@/app/lib/tools/loop-feed-priority-reporters-store";

export const dynamic = "force-dynamic";

const VERTICAL_IDS = new Set<SportVerticalId>([
  "football",
  "horse_racing",
  "rugby_union",
  "rugby_league",
  "cricket",
  "tennis",
  "f1",
  "multi",
]);

function isSportKey(v: string): v is SportVerticalId {
  return VERTICAL_IDS.has(v as SportVerticalId);
}

/** GET — list reporters; optional ?sport=football */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport")?.trim();
  const reporters = await readLoopFeedPriorityReporters();
  if (!sport || sport === "all") {
    return NextResponse.json({ reporters });
  }
  if (!isSportKey(sport)) {
    return NextResponse.json({ ok: false, error: "Invalid sport query." }, { status: 400 });
  }
  return NextResponse.json({ reporters: reporters.filter((r) => r.sportKey === sport) });
}

type PostBody = {
  sportKey?: string;
  name?: string;
  xHandle?: string;
  loopTopicUrl?: string;
  editorialNote?: string;
  affiliationScope?: string;
  teamName?: string;
  outlet?: string;
  roleCategory?: string;
  priority?: number;
  weight?: number;
  active?: boolean;
};

/** POST — create */
export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const sportKey = typeof body.sportKey === "string" ? body.sportKey.trim() : "";
  if (!sportKey || !isSportKey(sportKey)) {
    return NextResponse.json({ ok: false, error: "sportKey is required." }, { status: 400 });
  }
  if (sportKey === "multi") {
    return NextResponse.json(
      { ok: false, error: 'Choose a specific sport for each reporter (not "All sports").' },
      { status: 400 },
    );
  }
  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json({ ok: false, error: "name is required." }, { status: 400 });
  }
  try {
    const affiliationScope = normalizeReporterAffiliationScope(body.affiliationScope);
    const reporter = await upsertLoopFeedPriorityReporter({
      sportKey,
      name,
      xHandle: typeof body.xHandle === "string" ? body.xHandle : undefined,
      loopTopicUrl: typeof body.loopTopicUrl === "string" ? body.loopTopicUrl : undefined,
      editorialNote: typeof body.editorialNote === "string" ? body.editorialNote : undefined,
      affiliationScope,
      teamName: normalizeReporterTeamName(body.teamName, affiliationScope),
      outlet: normalizeReporterOutlet(body.outlet),
      roleCategory: normalizeReporterRoleCategory(body.roleCategory),
      priority: normalizeReporterPriority(body.priority),
      weight: normalizeReporterWeight(body.weight),
      active: body.active !== false,
    });
    return NextResponse.json({ ok: true, reporter });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

type PatchBody = PostBody & { id?: string };

/** PATCH — update */
export async function PATCH(req: Request) {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });

  const existing = (await readLoopFeedPriorityReporters()).find((r) => r.id === id);
  if (!existing) return NextResponse.json({ ok: false, error: "Reporter not found." }, { status: 404 });

  const sportKey =
    typeof body.sportKey === "string" && isSportKey(body.sportKey.trim())
      ? (body.sportKey.trim() as SportVerticalId)
      : existing.sportKey;
  if (sportKey === "multi") {
    return NextResponse.json(
      { ok: false, error: 'Choose a specific sport for each reporter (not "All sports").' },
      { status: 400 },
    );
  }
  const name = typeof body.name === "string" ? body.name : existing.name;
  const xHandle = typeof body.xHandle === "string" ? body.xHandle : existing.xHandle;
  const loopTopicUrl = typeof body.loopTopicUrl === "string" ? body.loopTopicUrl : existing.loopTopicUrl;
  const editorialNote =
    typeof body.editorialNote === "string" ? body.editorialNote : existing.editorialNote;
  const affiliationScope =
    body.affiliationScope !== undefined
      ? normalizeReporterAffiliationScope(body.affiliationScope)
      : existing.affiliationScope;
  const teamName =
    body.teamName !== undefined
      ? normalizeReporterTeamName(body.teamName, affiliationScope)
      : normalizeReporterTeamName(existing.teamName, affiliationScope);
  const outlet = body.outlet !== undefined ? normalizeReporterOutlet(body.outlet) : existing.outlet;
  const roleCategory =
    body.roleCategory !== undefined
      ? normalizeReporterRoleCategory(body.roleCategory)
      : existing.roleCategory;
  const priority = body.priority !== undefined ? normalizeReporterPriority(body.priority) : existing.priority;
  const weight = body.weight !== undefined ? normalizeReporterWeight(body.weight) : existing.weight;
  const active = typeof body.active === "boolean" ? body.active : existing.active;

  try {
    const reporter = await upsertLoopFeedPriorityReporter({
      id,
      sportKey,
      name,
      xHandle,
      loopTopicUrl,
      editorialNote,
      affiliationScope,
      teamName,
      outlet,
      roleCategory,
      priority,
      weight,
      active,
    });
    return NextResponse.json({ ok: true, reporter });
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
  const ok = await deleteLoopFeedPriorityReporter(id);
  if (!ok) return NextResponse.json({ ok: false, error: "Reporter not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
