import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioGuestsPage() {
  redirect("/audio-studio?tool=guests");
}
