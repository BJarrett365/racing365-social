import type { Metadata } from "next";
import { PodcastTemplateApp } from "@/components/podcast-template/PodcastTemplateApp";

export const metadata: Metadata = {
  title: "Podcast Template",
  description: "Isolated multi-speaker podcast generation template.",
};

export default function PodcastTemplatePage() {
  // Isolated route: no existing template/editor flow is touched.
  return <PodcastTemplateApp />;
}
