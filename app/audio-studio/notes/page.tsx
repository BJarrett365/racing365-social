import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AudioNotesPage() {
  redirect("/audio-studio?tool=notes");
}
