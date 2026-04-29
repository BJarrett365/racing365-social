import { NextResponse } from "next/server";
import { getRacingDataProvider } from "@/app/features/data/providers";
import {
  generateFromF1Grid,
  generateFromF1Results,
  generateFromFastResult,
  generateFromFootballLineups,
  generateFromNextOff,
  generateFromPlanetFootballTable,
  generateFromPlanetRugbyTable,
  generateFromRacecard,
  generateFromTeamtalkNews,
} from "@/app/features/content/content-generator";
import type { ContentFormat, GeneratedContent, SceneSpec, TemplateSource } from "@/types";
import { enhanceCaption } from "@/app/features/content/openai-stub";

type Body = {
  format: ContentFormat;
  id: string;
  headline?: string;
  caption?: string;
  script?: string;
  cta?: string;
  scenes?: Partial<SceneSpec>[];
  templateSource?: TemplateSource;
};

function mergeGenerated(base: GeneratedContent, body: Body): GeneratedContent {
  let scenes = base.scenes;
  if (body.scenes && body.scenes.length === base.scenes.length) {
    scenes = base.scenes.map((s, i) => ({ ...s, ...body.scenes![i] }));
  }
  return {
    ...base,
    headline: body.headline ?? base.headline,
    caption: body.caption ?? base.caption,
    script: body.script ?? base.script,
    cta: body.cta ?? base.cta,
    scenes,
    templateSource: body.templateSource ?? base.templateSource,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.format || !body?.id) {
      return NextResponse.json({ error: "format and id required" }, { status: 400 });
    }

    const p = getRacingDataProvider();
    let base: GeneratedContent;

    if (body.format === "next-off") {
      const bundle = await p.getNextOffById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromNextOff(bundle),
        templateSource: { format: "next-off", bundle },
      };
    } else if (body.format === "fast-results") {
      const bundle = await p.getFastResultById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromFastResult(bundle),
        templateSource: { format: "fast-results", bundle },
      };
    } else if (body.format === "football-lineups") {
      const bundle = await p.getFootballLineupById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromFootballLineups(bundle),
        templateSource: { format: "football-lineups", bundle },
      };
    } else if (body.format === "teamtalk-news") {
      const bundle = await p.getTeamtalkNewsById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromTeamtalkNews(bundle),
        templateSource: { format: "teamtalk-news", bundle },
      };
    } else if (body.format === "f1-grid") {
      const bundle = await p.getF1GridById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromF1Grid(bundle),
        templateSource: { format: "f1-grid", bundle },
      };
    } else if (body.format === "f1-results") {
      const bundle = await p.getF1ResultsById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromF1Results(bundle),
        templateSource: { format: "f1-results", bundle },
      };
    } else if (body.format === "racecard") {
      const snap = await p.getRacecardById(body.id);
      if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromRacecard(snap),
        templateSource: { format: "racecard", snapshot: snap },
      };
    } else if (body.format === "planet-football-table") {
      const bundle = await p.getPlanetFootballTableById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromPlanetFootballTable(bundle),
        templateSource: { format: "planet-football-table", bundle },
      };
    } else if (body.format === "planet-rugby-table") {
      const bundle = await p.getPlanetRugbyTableById(body.id);
      if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      base = {
        ...generateFromPlanetRugbyTable(bundle),
        templateSource: { format: "planet-rugby-table", bundle },
      };
    } else {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    const merged = mergeGenerated(base, body);
    merged.caption = await enhanceCaption(merged.caption, merged.caption);

    return NextResponse.json({ content: merged });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
