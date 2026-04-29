import type { PodcastProject } from "@/types/podcast-template";

export function buildDialoguePayload(project: PodcastProject) {
  return {
    model_id: project.settings.modelId,
    language_code: project.settings.languageCode,
    output_format: project.settings.outputFormat,
    dialogue: [...project.segments]
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const speaker = project.speakers.find((x) => x.id === s.speakerId);
        return {
          speaker: s.speakerLabel,
          text: s.text,
          voice_id: speaker?.voiceId || undefined,
        };
      }),
  };
}
