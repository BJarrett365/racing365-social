import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata: Metadata = {
  title: `Audio Studio · ${BRAND_SUITE}`,
  description: "Audio notes, transcription, text to speech, voice workflows and language audio for Plexa Studio.",
};

export default function AudioStudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
