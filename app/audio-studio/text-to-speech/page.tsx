import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioTextToSpeechPage() {
  redirect("/audio-studio?tool=text-to-speech");
}
