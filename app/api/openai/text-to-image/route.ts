import { NextResponse } from "next/server";
import { OPENAI_IMAGE_PROMPT_MAX } from "@/app/lib/language-studio/f365-text-to-image-prompts";
import { saveOpenAiTextToImageBytesToLibrary } from "@/app/lib/language-studio/library-images";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type Body = {
  prompt?: string;
  /** Override default — see OPENAI_IMAGE_MODEL env / Admin → OpenAI image model */
  model?: string;
  /** Used for dall-e-3 / dall-e-2 only (ignored for gpt-image-*). */
  size?: "1792x1024" | "1024x1024" | "1024x1792";
  /** dall-e-3 only */
  quality?: "standard" | "hd";
};

async function resolveOpenAiImageModel(bodyModel?: string): Promise<string> {
  const fromBody = bodyModel?.trim();
  if (fromBody) return fromBody;
  const configured = await getServerSecretAsync("OPENAI_IMAGE_MODEL");
  if (configured) return configured;
  return "gpt-image-1";
}

/** Request bodies differ by model family (gpt-image vs dall-e). */
function buildImagesGenerationPayload(
  model: string,
  prompt: string,
  size: Body["size"],
  quality: Body["quality"],
): Record<string, unknown> {
  const lower = model.toLowerCase();
  if (lower.startsWith("gpt-image")) {
    return { model, prompt };
  }
  if (lower.includes("dall-e-3")) {
    return {
      model,
      prompt,
      n: 1,
      size: size ?? "1792x1024",
      quality: quality ?? "standard",
    };
  }
  let dalle2Size: string = size ?? "1024x1024";
  if (dalle2Size === "1792x1024" || dalle2Size === "1024x1792") {
    dalle2Size = "1024x1024";
  }
  return { model, prompt, n: 1, size: dalle2Size };
}

export async function POST(request: Request) {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured (OPENAI_API_KEY or Admin settings)." },
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

  const model = await resolveOpenAiImageModel(body.model);
  const size = body.size ?? "1792x1024";
  const quality = body.quality ?? "standard";
  const payload = buildImagesGenerationPayload(model, prompt, size, quality);

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = typeof data.error?.message === "string" ? data.error.message : `OpenAI error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const row = data.data?.[0];
    let imageUrl: string | undefined;
    let imageLibraryRel: string | undefined;

    try {
      if (typeof row?.url === "string" && row.url.trim()) {
        const assetRes = await fetch(row.url.trim(), {
          cache: "no-store",
          headers: { accept: "image/*,*/*", "user-agent": "PlanetSportStudio OpenAI-image-fetch/1.0" },
        });
        if (!assetRes.ok) {
          return NextResponse.json(
            { error: `Could not download OpenAI image URL (${assetRes.status}).` },
            { status: 502 },
          );
        }
        const buf = Buffer.from(await assetRes.arrayBuffer());
        const saved = await saveOpenAiTextToImageBytesToLibrary(buf, assetRes.headers.get("content-type") ?? undefined, request);
        imageUrl = saved.imageUrl;
        imageLibraryRel = saved.imageLibraryRel;
      } else if (typeof row?.b64_json === "string") {
        const buf = Buffer.from(row.b64_json, "base64");
        const saved = await saveOpenAiTextToImageBytesToLibrary(buf, "image/png", request);
        imageUrl = saved.imageUrl;
        imageLibraryRel = saved.imageLibraryRel;
      }
    } catch (persistErr) {
      const msg = persistErr instanceof Error ? persistErr.message : "Could not save image to library.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    if (!imageUrl || !imageLibraryRel) {
      return NextResponse.json({ error: "OpenAI returned no image URL or base64 payload." }, { status: 502 });
    }

    const responseSize = typeof payload.size === "string" ? payload.size : undefined;

    return NextResponse.json({
      ok: true,
      provider: "openai",
      model,
      size: responseSize,
      imageUrl,
      imageLibraryRel,
      revisedPrompt: row?.revised_prompt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI image request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
