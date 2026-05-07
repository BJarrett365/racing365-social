import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSecretAsync } from "@/app/lib/server-secrets";
import { audioStudioId, updateAudioStudioStore } from "@/app/lib/audio-studio-store";
import { audioFileFromForm, jsonError, saveAudioFileFromForm } from "../../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const permissionConfirmed = String(form.get("permissionConfirmed") ?? "") === "true";
    if (!permissionConfirmed) {
      return NextResponse.json({ error: "Voice cloning requires explicit permission confirmation." }, { status: 400 });
    }
    const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
    if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY is required" }, { status: 503 });

    const files = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
    const legacyFile = form.get("file");
    if (legacyFile instanceof File && legacyFile.size > 0) files.push(legacyFile);
    if (!files.length) return NextResponse.json({ error: "At least one voice sample is required" }, { status: 400 });
    const uniqueFiles = await uniqueFilesByContent(files);
    if (!uniqueFiles.length) return NextResponse.json({ error: "At least one unique voice sample is required" }, { status: 400 });
    if (uniqueFiles.length > 10) return NextResponse.json({ error: "Use 10 unique voice samples or fewer" }, { status: 400 });

    const voiceName = String(form.get("name") || `Planet Sport Studio Voice ${new Date().toLocaleDateString("en-GB")}`).trim();
    const description = String(form.get("description") || form.get("targetVoiceStyle") || "Created in Planet Sport Studio Audio Studio").trim();
    const removeBackgroundNoise = String(form.get("removeBackgroundNoise") ?? "") === "true";
    const labels = String(form.get("labels") ?? "").trim();
    const body = new FormData();
    body.set("name", voiceName);
    body.set("description", description);
    body.set("remove_background_noise", removeBackgroundNoise ? "true" : "false");
    if (labels) body.set("labels", labels);

    for (const file of uniqueFiles) {
      const sampleForm = new FormData();
      sampleForm.set("projectId", String(form.get("projectId") ?? ""));
      sampleForm.set("title", voiceName);
      sampleForm.set("file", file);
      await audioFileFromForm(sampleForm);
      body.append("files", file);
    }

    const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": key },
      body,
    });

    if (!res.ok) {
      const error = await res.text();
      if (res.status === 401 && error.includes("create_instant_voice_clone")) {
        return NextResponse.json(
          {
            error:
              "ElevenLabs rejected the API key: it is missing the create_instant_voice_clone permission. Enable Instant Voice Clone/create voice permissions for this key in ElevenLabs, or use a key from a workspace/plan that supports voice cloning.",
            providerError: error.slice(0, 1000),
          },
          { status: 502 },
        );
      }
      if (error.includes("duplicated_files")) {
        return NextResponse.json(
          {
            error:
              "ElevenLabs rejected the samples because at least two uploaded clips contain the same audio. Remove duplicates and upload distinct voice samples.",
            providerError: error.slice(0, 1000),
          },
          { status: 400 },
        );
      }
      throw new Error(`ElevenLabs voice creation failed (${res.status}): ${error.slice(0, 500)}`);
    }

    const savedSamples = [];
    for (const file of uniqueFiles) {
      const sampleForm = new FormData();
      sampleForm.set("projectId", String(form.get("projectId") ?? ""));
      sampleForm.set("title", voiceName);
      sampleForm.set("file", file);
      savedSamples.push(await saveAudioFileFromForm(sampleForm, "recording"));
    }

    const data = await res.json() as { voice_id?: string; requires_verification?: boolean };
    const voice = {
      id: audioStudioId("aud_voice"),
      name: voiceName,
      provider: "elevenlabs" as const,
      voiceId: data.voice_id || "",
      permissionConfirmed,
      sampleFileIds: savedSamples.map((sample) => sample.id),
      createdAt: new Date().toISOString(),
    };

    await updateAudioStudioStore((store) => {
      store.voices.unshift(voice);
    });

    return NextResponse.json({ files: savedSamples, voice, requiresVerification: Boolean(data.requires_verification) });
  } catch (error) {
    return jsonError(error, "ElevenLabs voice creation failed");
  }
}

async function uniqueFilesByContent(files: File[]): Promise<File[]> {
  const seen = new Set<string>();
  const uniqueFiles: File[] = [];
  for (const file of files) {
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(await file.arrayBuffer()))
      .digest("hex");
    if (seen.has(hash)) continue;
    seen.add(hash);
    uniqueFiles.push(file);
  }
  return uniqueFiles;
}
