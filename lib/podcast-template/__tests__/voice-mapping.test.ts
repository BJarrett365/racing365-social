import assert from "node:assert/strict";
import test from "node:test";
import { ScriptParserService } from "../script-parser-service";

test("reuses existing speaker ids when labels match", () => {
  const svc = new ScriptParserService();
  const parsed = svc.parse({
    script: "Host: First line\nHOST: Second line",
    existingSpeakers: [
      {
        id: "speaker-host",
        name: "HOST",
        role: "Host",
        voiceId: "voice-123",
        voiceSettings: { stability: 0.5, similarityBoost: 0.7, style: 0.2, speakerBoost: true },
      },
    ],
  });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.segments[0]?.speakerId, "speaker-host");
  assert.equal(parsed.segments[1]?.speakerId, "speaker-host");
});
