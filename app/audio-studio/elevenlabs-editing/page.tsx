import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ElevenLabsEditingPage() {
  redirect("/audio-studio?tool=elevenlabs-editing");
}
