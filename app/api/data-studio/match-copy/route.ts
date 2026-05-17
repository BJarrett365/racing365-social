import { NextResponse } from "next/server";
import { generateMatchArticleMarkdown } from "@/app/lib/data-studio/match-copy-ai";
import type { LoopFeedContext } from "@/app/lib/data-studio/loop-feed";
import type { SportVerticalId } from "@/app/lib/data-studio/types";
import { SPORT_VERTICALS } from "@/app/lib/data-studio/sport-verticals";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import {
  formatPriorityReportersForPrompt,
  readLoopFeedPriorityReportersBySport,
} from "@/app/lib/tools/loop-feed-priority-reporters-store";

export const dynamic = "force-dynamic";

type Body = {
  mode?: string;
  fixturePayload?: unknown;
  includePlayerRatings?: boolean;
  journalistProfileId?: string;
  /** Server-fetched Loop Feed snapshot (match-day social context). */
  loopFeedContext?: LoopFeedContext;
  /** Data Studio vertical — selects priority reporters catalogue. */
  sportVertical?: string;
  /** Optional Football365 / F365 Features cadence hints (tone only). */
  football365ToneBoost?: boolean;
};

const REPORTER_VERTICALS: SportVerticalId[] = [
  "football",
  "horse_racing",
  "rugby_union",
  "rugby_league",
  "cricket",
  "tennis",
  "f1",
];

function resolveSportVerticalForReporters(raw: unknown): SportVerticalId | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim() as SportVerticalId;
  if (v === "multi") return null;
  return REPORTER_VERTICALS.includes(v) ? v : null;
}

/**
 * POST /api/data-studio/match-copy
 * Body: { mode, fixturePayload, includePlayerRatings?, journalistProfileId?, loopFeedContext?, sportVertical? }
 * Response: { markdown } — **WordPress-ready HTML fragment** (semantic h1–h3, p, strong, a). Field name remains \`markdown\` for API compatibility.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const mode =
    body.mode === "preview" || body.mode === "report" || body.mode === "sixteen_conclusions" ? body.mode : null;
  if (!mode) {
    return NextResponse.json(
      { ok: false, error: 'mode must be "preview", "report", or "sixteen_conclusions".' },
      { status: 400 },
    );
  }

  const payload = body.fixturePayload;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "fixturePayload must be a JSON object." }, { status: 400 });
  }

  let journalistNotes = "";
  const profileId = typeof body.journalistProfileId === "string" ? body.journalistProfileId.trim() : "";
  if (profileId) {
    const data = await readLanguageStudioData();
    const profile = data.journalistProfiles[profileId];
    if (profile?.active) {
      journalistNotes = `${profile.name} (${profile.brand}${profile.sports.length ? ` · ${profile.sports.join(", ")}` : ""})\n${profile.styleNotes}`;
      if (profile.articleGuidelines?.trim()) {
        journalistNotes += `\n\nEditorial guidelines:\n${profile.articleGuidelines.trim()}`;
      }
    }
  }

  let priorityReportersBrief = "";
  const sportV = resolveSportVerticalForReporters(body.sportVertical);
  if (sportV) {
    const reps = await readLoopFeedPriorityReportersBySport(sportV);
    const sportLabel = SPORT_VERTICALS.find((x) => x.id === sportV)?.label ?? sportV;
    priorityReportersBrief = formatPriorityReportersForPrompt(reps, sportLabel);
  }

  try {
    const markdown = await generateMatchArticleMarkdown({
      mode,
      fixturePayload: payload,
      includePlayerRatings: mode === "report" && body.includePlayerRatings !== false,
      journalistNotes: journalistNotes || undefined,
      priorityReportersBrief: priorityReportersBrief.trim() || undefined,
      football365ToneBoost: body.football365ToneBoost === true,
      loopFeedContext:
        body.loopFeedContext &&
        typeof body.loopFeedContext === "object" &&
        Array.isArray((body.loopFeedContext as LoopFeedContext).sides)
          ? body.loopFeedContext
          : undefined,
    });
    return NextResponse.json({ ok: true, mode, markdown });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed.";
    const lower = message.toLowerCase();
    const status =
      lower.includes("not configured") || lower.includes("api key") ? 503 : lower.includes("openai") ? 502 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
