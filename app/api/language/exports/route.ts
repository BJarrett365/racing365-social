import { NextResponse } from "next/server";
import { readLanguageStudioData, sortDesc } from "@/app/lib/language-studio/store";

export async function GET() {
  const data = await readLanguageStudioData();
  return NextResponse.json({ exports: sortDesc(Object.values(data.exports)) });
}
