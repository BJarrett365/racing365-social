import assert from "node:assert/strict";
import test from "node:test";
import { ScriptParserService } from "../script-parser-service";

test("parses HOST: line format", () => {
  const svc = new ScriptParserService();
  const parsed = svc.parse({
    script: "HOST: Hello\nGUEST: Hi there",
    existingSpeakers: [],
  });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.speakers.length, 2);
});

test("parses JSON speaker array", () => {
  const svc = new ScriptParserService();
  const parsed = svc.parse({
    script: JSON.stringify([
      { speaker: "HOST", text: "Welcome" },
      { speaker: "CO-HOST", text: "Let's start" },
    ]),
    existingSpeakers: [],
  });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.segments.length, 2);
});

test("returns validation error for unknown format", () => {
  const svc = new ScriptParserService();
  const parsed = svc.parse({
    script: "just plain text with no labels",
    existingSpeakers: [],
  });
  assert.ok(parsed.errors.length > 0);
});
