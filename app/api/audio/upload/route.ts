import { NextResponse } from "next/server";
import { jsonError, saveAudioFileFromForm } from "../_shared";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = await saveAudioFileFromForm(form, "upload");
    return NextResponse.json({ file });
  } catch (error) {
    return jsonError(error, "Audio upload failed", 400);
  }
}
