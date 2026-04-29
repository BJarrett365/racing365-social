import assert from "node:assert/strict";
import test from "node:test";
import { buildDialoguePayload } from "../generation-payload";
import type { PodcastProject } from "../../../types/podcast-template";
import { PODCAST_DEFAULT_GENERATION_SETTINGS } from "../constants";

const sampleProject: PodcastProject = {
  id: "podtpl-test",
  title: "Test",
  sourceType: "paste",
  importedText: "",
  scriptConversionPrompt: "prompt",
  rawScript: "HOST: hello",
  segments: [
    { id: "s1", speakerId: "sp1", speakerLabel: "HOST", text: "Hello", order: 0 },
    { id: "s2", speakerId: "sp2", speakerLabel: "GUEST", text: "Hi", order: 1 },
  ],
  speakers: [
    {
      id: "sp1",
      name: "HOST",
      role: "Host",
      voiceId: "voiceA",
      voiceSettings: { stability: 0.5, similarityBoost: 0.8, style: 0.2, speakerBoost: true },
    },
    {
      id: "sp2",
      name: "GUEST",
      role: "Guest",
      voiceId: "voiceB",
      voiceSettings: { stability: 0.5, similarityBoost: 0.8, style: 0.2, speakerBoost: true },
    },
  ],
  chapters: [],
  settings: { ...PODCAST_DEFAULT_GENERATION_SETTINGS },
  generationHistory: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("builds dialogue payload with mapped voice ids", () => {
  const payload = buildDialoguePayload(sampleProject);
  assert.equal(payload.dialogue.length, 2);
  assert.equal(payload.dialogue[0]?.voice_id, "voiceA");
  assert.equal(payload.dialogue[1]?.voice_id, "voiceB");
});
