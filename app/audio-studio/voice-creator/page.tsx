import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioVoiceCreatorPage() {
  redirect("/audio-studio?tool=voice-creator");
}
