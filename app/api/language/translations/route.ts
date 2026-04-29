import { NextResponse } from "next/server";
import { readLanguageStudioData, sortDesc } from "@/app/lib/language-studio/store";

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({
    translations: sortDesc(Object.values(data.translations)),
    articles: Object.values(data.articles),
  });
}
