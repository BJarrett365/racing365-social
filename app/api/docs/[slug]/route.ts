import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const DOCS: Record<string, { file: string; title: string; root?: boolean }> = {
  install: { file: "install.md", title: "Planet Sport Studio Install Guide" },
  environment: { file: "environment.md", title: "Environment Variables" },
  "language-studio": { file: "language-studio.md", title: "Language Studio Admin Guide" },
  "client-access": { file: "client-access.md", title: "Client Access Guide" },
  "client-api": { file: "client-api.md", title: "Client API Reference" },
  deployment: { file: "deployment.md", title: "Deployment Guide" },
  troubleshooting: { file: "troubleshooting.md", title: "Troubleshooting" },
  "plexa-studio-rd-report": {
    file: "PLEXA_STUDIO_RD_REPORT.md",
    title: "Plexa / Planet Sport AI Studio — R&D Technical Report",
    root: true,
  },
  "match-report-builder-rd": {
    file: "match-report-builder-rd-plan.md",
    title: "Match Report Builder V1 — R&D Plan",
  },
  "match-intelligence-engine": {
    file: "plexa-match-intelligence-engine-plan.md",
    title: "Plexa Match Intelligence Engine — Planning & Architecture",
  },
  "match-preview-v1-spec": {
    file: "match-preview-v1-spec.md",
    title: "Match Preview V1 — Product & Intelligence Layer Specification",
  },
  "match-preview-rd-report": {
    file: "match-preview-rd-report.md",
    title: "Match Preview — Editorial & SEO Benchmark R&D Report",
  },
  "football365-editorial-calibration": {
    file: "football365-editorial-calibration.md",
    title: "Football365 Editorial Calibration — ChatGPT Decisions Log",
  },
  "football365-preview-scoring-engine": {
    file: "football365-preview-scoring-engine.md",
    title: "Football365 Preview 10/10 — Editorial Scoring Engine",
  },
  "rd-index": {
    file: "R&D/README.md",
    title: "R&D Document Registry — Master Index",
  },
};

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const doc = DOCS[slug];
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const filePath = path.join(process.cwd(), doc.root ? "" : "docs", doc.file);
  const body = await fs.readFile(filePath, "utf-8");
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
      ...(download
        ? { "content-disposition": `attachment; filename="${doc.file}"` }
        : { "content-disposition": `inline; filename="${doc.file}"` }),
    },
  });
}
