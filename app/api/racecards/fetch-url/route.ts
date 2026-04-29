import { NextResponse } from "next/server";
import {
  RacecardUrlImportError,
  parseRacecardFromUrl,
  type RacecardTemplatePreview,
} from "@/app/lib/parseRacecardUrl";

type Body = { url?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Please enter a valid URL" }, { status: 400 });
  }

  try {
    const preview: RacecardTemplatePreview = await parseRacecardFromUrl(url);
    return NextResponse.json({ preview });
  } catch (e) {
    if (e instanceof RacecardUrlImportError) {
      const status =
        e.code === "empty" || e.code === "invalid_url"
          ? 400
          : e.code === "blocked"
            ? 403
            : 422;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: "We could not fetch data from this page", detail: message }, { status: 502 });
  }
}
