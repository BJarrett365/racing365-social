import { NextResponse } from "next/server";
import { importChartbeatCsv } from "@/app/lib/language-studio/chartbeat-import";
import { ensureJournalistKnowledgeFiles } from "@/app/lib/language-studio/journalist-knowledge-sync";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

type Body = {
  csvText?: string;
  brand?: string;
  label?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const csvText = body?.csvText?.trim();
  const brand = body?.brand?.trim();
  if (!csvText || !brand) {
    return NextResponse.json({ error: "csvText and brand are required." }, { status: 400 });
  }

  const data = await readLanguageStudioData();
  const result = importChartbeatCsv(data, { csvText, brand, label: body?.label });
  ensureJournalistKnowledgeFiles(data);
  await writeLanguageStudioData(data);

  return NextResponse.json({ success: true, ...result });
}

export async function GET() {
  const data = await readLanguageStudioData();
  const imports = Object.values(data.chartbeatImports ?? {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ imports });
}
