import { NextResponse } from "next/server";
import { jsonError, saveAudioFileFromForm } from "../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = await saveAudioFileFromForm(form, "recording");
    return NextResponse.json({ file });
  } catch (error) {
    return jsonError(error, "Audio recording save failed", 400);
  }
}
