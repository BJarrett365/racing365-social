import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const DOCS: Record<string, { file: string; title: string }> = {
  install: { file: "install.md", title: "Plexa Studio Install Guide" },
  environment: { file: "environment.md", title: "Environment Variables" },
  "language-studio": { file: "language-studio.md", title: "Language Studio Admin Guide" },
  "client-access": { file: "client-access.md", title: "Client Access Guide" },
  "client-api": { file: "client-api.md", title: "Client API Reference" },
  deployment: { file: "deployment.md", title: "Deployment Guide" },
  troubleshooting: { file: "troubleshooting.md", title: "Troubleshooting" },
};

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const doc = DOCS[slug];
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const filePath = path.join(process.cwd(), "docs", doc.file);
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
