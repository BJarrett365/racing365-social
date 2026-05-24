import { describe, expect, it } from "vitest";
import {
  extractTwitterStatusUrls,
  parseSocialPostText,
  stripTwitterUrlsFromText,
} from "@/app/lib/match-report/parse-social-post";

describe("parse-social-post", () => {
  it("extracts twitter and x.com status urls", () => {
    const text =
      '🎙️ "It felt like home very quickly" Watch now! https://twitter.com/lufc/status/2057537758256591260';
    expect(extractTwitterStatusUrls(text)).toEqual([
      "https://twitter.com/i/status/2057537758256591260",
    ]);
    expect(stripTwitterUrlsFromText(text)).toBe(
      '🎙️ "It felt like home very quickly" Watch now!',
    );
  });

  it("parses caption and urls together", () => {
    const parsed = parseSocialPostText(
      "Vibes from Daniel Farke https://x.com/apopey/status/2057818614829367685",
    );
    expect(parsed.tweetUrls).toEqual(["https://twitter.com/i/status/2057818614829367685"]);
    expect(parsed.caption).toBe("Vibes from Daniel Farke");
  });
});
