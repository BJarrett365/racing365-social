import { NextResponse } from "next/server";
import {
  getHiggsfieldAuthorizationHeader,
  higgsfieldSubscribeAndPoll,
} from "@/app/lib/higgsfield/client";
import { DEFAULT_HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT } from "@/app/lib/higgsfield/constants";
import { OPENAI_IMAGE_PROMPT_MAX } from "@/app/lib/language-studio/f365-text-to-image-prompts";
import { saveHiggsfieldEditImageBytesToLibrary } from "@/app/lib/language-studio/library-images";

type Body = {
  prompt?: string;
  /** e.g. 16:9 — must be one of allowed set */
  aspectRatio?: string;
  /** Full platform path; defaults to env HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT or Seedream v4 */
  modelEndpoint?: string;
};

const ASPECT_RATIOS = new Set(["1:1", "4:3", "3:4", "16:9", "9:16"]);

export async function POST(request: Request) {
  const auth = await getHiggsfieldAuthorizationHeader();
  if (!auth) {
    return NextResponse.json(
      {
        error:
          "Higgsfield is not configured (HF_CREDENTIALS or HF_API_KEY + HF_API_SECRET, or Admin → Higgsfield).",
      },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }
  if (prompt.length > OPENAI_IMAGE_PROMPT_MAX) {
    return NextResponse.json(
      { error: `prompt must be at most ${OPENAI_IMAGE_PROMPT_MAX} characters.` },
      { status: 400 },
    );
  }

  const aspectRatio =
    typeof body.aspectRatio === "string" && ASPECT_RATIOS.has(body.aspectRatio.trim())
      ? body.aspectRatio.trim()
      : "16:9";

  const fromEnv = process.env.HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT?.trim();
  const pathSeg =
    typeof body.modelEndpoint === "string" && body.modelEndpoint.trim()
      ? body.modelEndpoint.trim().replace(/^\//, "")
      : (fromEnv && fromEnv.replace(/^\//, "")) || DEFAULT_HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT;

  const hfBody: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    safety_tolerance: 2,
  };

  // ByteDance Seedream v4 (common default) expects these; other endpoints may ignore extras.
  if (pathSeg.includes("seedream")) {
    hfBody.resolution = process.env.HIGGSFIELD_TEXT_TO_IMAGE_RESOLUTION?.trim() || "1K";
    hfBody.camera_fixed = false;
  }

  try {
    const { images } = await higgsfieldSubscribeAndPoll({
      authorization: auth,
      modelEndpoint: pathSeg,
      body: hfBody,
      maxPollMs: 120_000,
    });

    const firstUrl = images[0]?.url?.trim();
    if (!firstUrl) {
      return NextResponse.json({ error: "Higgsfield returned no image URL." }, { status: 502 });
    }

    const assetRes = await fetch(firstUrl, {
      cache: "no-store",
      headers: { accept: "image/*,*/*", "user-agent": "PlanetSportStudio Higgsfield-t2i/1.0" },
    });
    if (!assetRes.ok) {
      return NextResponse.json(
        { error: `Could not download Higgsfield image (${assetRes.status}).` },
        { status: 502 },
      );
    }

    const bytes = Buffer.from(await assetRes.arrayBuffer());
    const saved = await saveHiggsfieldEditImageBytesToLibrary(bytes, assetRes.headers.get("content-type") ?? undefined, request);

    return NextResponse.json({
      ok: true,
      provider: "higgsfield",
      modelEndpoint: pathSeg,
      imageUrl: saved.imageUrl,
      imageLibraryRel: saved.imageLibraryRel,
    });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Higgsfield text-to-image failed. Try another model path via HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
