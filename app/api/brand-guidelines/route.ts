import { NextResponse } from "next/server";
import {
  listBrandGuidelineMeta,
  readBrandGuidelinesFile,
  updateBrandGuideline,
  type BrandGuidelineSlug,
} from "@/app/lib/brand-guidelines-store";

const SLUGS = new Set<string>(["plexa", "racing365", "teamtalk", "planetf1", "f365"]);

export async function GET() {
  const meta = listBrandGuidelineMeta();
  const file = await readBrandGuidelinesFile();
  const brands = meta.map(({ slug, label }) => ({
    slug,
    label: file.brands[slug]?.label ?? label,
    body: file.brands[slug]?.body ?? "",
    updatedAt: file.brands[slug]?.updatedAt ?? "",
  }));
  return NextResponse.json({ brands });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing body." }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const slug = typeof o.slug === "string" ? o.slug.trim() : "";
  const text = typeof o.body === "string" ? o.body : "";
  if (!SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }
  try {
    const updated = await updateBrandGuideline(slug as BrandGuidelineSlug, text);
    return NextResponse.json({ brand: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save brand guidelines." }, { status: 500 });
  }
}
