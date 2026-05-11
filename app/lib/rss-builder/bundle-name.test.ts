import { describe, expect, it } from "vitest";
import { escapeForPostgrestIlikeExact, normalizeBundleNameKey } from "@/app/lib/rss-builder/bundle-name";

describe("bundle-name", () => {
  it("normalizeBundleNameKey trims and lowercases", () => {
    expect(normalizeBundleNameKey("  Horse Racing  ")).toBe("horse racing");
  });

  it("escapeForPostgrestIlikeExact escapes ilike metacharacters", () => {
    expect(escapeForPostgrestIlikeExact("100%_off")).toBe("100\\%\\_off");
    expect(escapeForPostgrestIlikeExact("a\\b")).toBe("a\\\\b");
  });
});
