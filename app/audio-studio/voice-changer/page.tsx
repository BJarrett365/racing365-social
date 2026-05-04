import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioVoiceChangerPage() {
  redirect("/audio-studio?tool=voice-changer");
}
