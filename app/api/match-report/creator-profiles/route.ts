import { NextResponse } from "next/server";
import { filterJournalistProfiles } from "@/app/lib/match-report/editorial-governance";
import type { MatchReportTargetBrand } from "@/app/lib/match-report/types";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";

const VALID_BRANDS = new Set<MatchReportTargetBrand>([
  "football365",
  "teamtalk",
  "planet-football",
  "sport365",
]);

export async function GET(req: Request) {
  try {
    const brandParam = new URL(req.url).searchParams.get("brand")?.trim() ?? "";
    const data = await readLanguageStudioData();
    const all = Object.values(data.journalistProfiles);

    const profiles =
      brandParam && VALID_BRANDS.has(brandParam as MatchReportTargetBrand)
        ? filterJournalistProfiles(all, brandParam as MatchReportTargetBrand)
        : all.filter((row) => row.active);

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("[match-report/creator-profiles]", error);
    return NextResponse.json({ error: "Failed to load Content Creator profiles." }, { status: 500 });
  }
}
