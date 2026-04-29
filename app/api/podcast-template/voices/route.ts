import { NextResponse } from "next/server";
import { ElevenLabsVoiceService } from "@/lib/podcast-template/elevenlabs-voice-service";

export async function GET() {
  try {
    const voices = await new ElevenLabsVoiceService().listVoices();
    return NextResponse.json({ voices, source: "elevenlabs" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load voices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
