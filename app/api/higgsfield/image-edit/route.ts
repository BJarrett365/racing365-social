import { NextResponse } from "next/server";
import {
  DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT,
  higgsfieldSubscribeAndPoll,
  getHiggsfieldAuthorizationHeader,
  resolveHiggsfieldImageEditEndpoint,
} from "@/app/lib/higgsfield/client";
import { OPENAI_IMAGE_PROMPT_MAX } from "@/app/lib/language-studio/f365-text-to-image-prompts";
import {
  saveHiggsfieldEditImageBytesToLibrary,
  saveHiggsfieldSourceImageBytesForPublicUrl,
} from "@/app/lib/language-studio/library-images";

type Body = {
  prompt?: string;
  /** e.g. "16:9", "1:1" — passed through when set */
  aspectRatio?: string;
  /** Raw base64 without data: prefix */
  imageBase64?: string;
  imageMimeType?: string;
  /** Public HTTPS URL Higgsfield can GET */
  sourceImageUrl?: string;
  /** Full model path; defaults to env / admin / Soul Kontext */
  modelEndpoint?: string;
  safetyTolerance?: number;
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
      : "1:1";

  const sourceUrlRaw = typeof body.sourceImageUrl === "string" ? body.sourceImageUrl.trim() : "";
  const imageB64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const imageMime = typeof body.imageMimeType === "string" ? body.imageMimeType.trim().toLowerCase() : "";

  let publicSourceUrl: string;
  let sourceLibraryRel: string | undefined;

  try {
    if (sourceUrlRaw) {
      let u: URL;
      try {
        u = new URL(sourceUrlRaw);
      } catch {
        return NextResponse.json({ error: "sourceImageUrl must be a valid URL." }, { status: 400 });
      }
      if (u.protocol !== "https:") {
        return NextResponse.json(
          { error: "sourceImageUrl must use https so Higgsfield can fetch it." },
          { status: 400 },
        );
      }
      publicSourceUrl = sourceUrlRaw;
    } else if (imageB64) {
      const buf = Buffer.from(imageB64, "base64");
      const mime =
        imageMime && imageMime.startsWith("image/")
          ? imageMime
          : "image/png";
      const saved = await saveHiggsfieldSourceImageBytesForPublicUrl(buf, mime, request);
      publicSourceUrl = saved.imageUrl;
      sourceLibraryRel = saved.imageLibraryRel;
    } else {
      return NextResponse.json(
        { error: "Provide either imageBase64 (+ imageMimeType) or sourceImageUrl." },
        { status: 400 },
      );
    }

    const modelEndpoint =
      typeof body.modelEndpoint === "string" && body.modelEndpoint.trim()
        ? body.modelEndpoint.trim().replace(/^\//, "")
        : await resolveHiggsfieldImageEditEndpoint();

    const safety =
      typeof body.safetyTolerance === "number" && Number.isFinite(body.safetyTolerance)
        ? Math.min(6, Math.max(0, Math.floor(body.safetyTolerance)))
        : 2;

    const hfBody: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      safety_tolerance: safety,
      input_images: [{ type: "image_url", image_url: publicSourceUrl }],
    };

    const { images } = await higgsfieldSubscribeAndPoll({
      authorization: auth,
      modelEndpoint,
      body: hfBody,
    });

    const firstUrl = images[0]?.url?.trim();
    if (!firstUrl) {
      return NextResponse.json({ error: "Higgsfield returned no image URL." }, { status: 502 });
    }

    const assetRes = await fetch(firstUrl, {
      cache: "no-store",
      headers: { accept: "image/*,*/*", "user-agent": "PlanetSportStudio Higgsfield-fetch/1.0" },
    });
    if (!assetRes.ok) {
      return NextResponse.json(
        { error: `Could not download result image (${assetRes.status}).` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await assetRes.arrayBuffer());
    const persisted = await saveHiggsfieldEditImageBytesToLibrary(
      buf,
      assetRes.headers.get("content-type") ?? undefined,
      request,
    );

    return NextResponse.json({
      ok: true,
      provider: "higgsfield",
      modelEndpoint,
      defaultEndpointHint: DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT,
      prompt,
      aspectRatio,
      sourceLibraryRel,
      resultUrl: firstUrl,
      imageUrl: persisted.imageUrl,
      imageLibraryRel: persisted.imageLibraryRel,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Higgsfield image edit failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
