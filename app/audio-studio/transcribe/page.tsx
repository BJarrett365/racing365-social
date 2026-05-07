import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioTranscribePage() {
  redirect("/audio-studio?tool=transcribe");
}
