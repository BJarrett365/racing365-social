import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioVoiceIsolatorPage() {
  redirect("/audio-studio?tool=voice-isolator");
}
