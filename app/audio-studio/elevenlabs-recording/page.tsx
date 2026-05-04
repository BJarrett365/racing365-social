import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ElevenLabsRecordingPage() {
  redirect("/audio-studio?tool=elevenlabs-recording");
}
