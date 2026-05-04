import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioLanguagePage() {
  redirect("/audio-studio?tool=language");
}
