import { NextResponse } from "next/server";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import { getMatchReportRepository, MatchReportStoreError } from "@/app/lib/match-report/store";
import type { ImageAsset, ImageIntelligence } from "@/app/lib/match-report/types";

export const dynamic = "force-dynamic";

type Body = {
  projectId?: string;
  source?: "library" | "generate" | "skip";
  libraryUrl?: string;
  libraryRel?: string;
  rightsChecked?: boolean;
  heroUrl?: string;
  generationPrompt?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const projectId = body.projectId?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    const repo = getMatchReportRepository();
    const project = await repo.getProject(projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    if (body.source === "skip") {
      const updated = await repo.skipImageIntelligence(projectId);
      return NextResponse.json({ project: updated });
    }

    const heroUrl = body.libraryUrl?.trim() || body.heroUrl?.trim();
    if (!heroUrl) {
      return NextResponse.json({ error: "libraryUrl or heroUrl is required." }, { status: 400 });
    }
    if (!body.rightsChecked) {
      return NextResponse.json({ error: "Rights must be confirmed before using library image." }, { status: 400 });
    }

    const hero: ImageAsset = { url: heroUrl, width: 1280, height: 720, rel: body.libraryRel, label: "Hero" };
    const imageIntelligence: ImageIntelligence = {
      source: body.source === "library" ? "library" : "ai_generated",
      rightsChecked: true,
      hero,
      variants: {
        instagram: { ...hero, label: "Instagram", width: 1080, height: 1080 },
        stories: { ...hero, label: "Stories", width: 1080, height: 1920 },
        youtubeThumb: { ...hero, label: "YouTube thumb" },
      },
      libraryRef: body.libraryRel,
      generationPrompt: body.generationPrompt?.trim() || undefined,
      approvedAt: new Date().toISOString(),
    };
    const updated = await repo.setImageIntelligence(projectId, imageIntelligence);
    return NextResponse.json({ project: updated, brand: BRAND_LABEL_BY_TARGET[project.editorial.targetBrand] });
  } catch (e) {
    if (e instanceof MatchReportStoreError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const message = e instanceof Error ? e.message : "Image intelligence failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
