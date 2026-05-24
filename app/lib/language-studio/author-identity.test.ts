import { describe, expect, it } from "vitest";
import {
  journalistIdentityKey,
  journalistIdentityKeyFromRaw,
  mergeProfilesByIdentity,
  mergeTwoJournalistDisplayNames,
  normalizeAuthorIdentity,
} from "@/app/lib/language-studio/author-identity";
import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";

const brand = "Football365";

describe("normalizeAuthorIdentity", () => {
  it("parses F365 author URLs, strips www, maps slug editorf365 to Editor F365", () => {
    const raw = "https://www.football365.com/author/editorf365";
    const id = normalizeAuthorIdentity(raw, brand);
    expect(id?.displayName).toBe("Editor F365");
    expect(id?.canonicalSlug).toBe("editorf365");
    expect(id?.authorPageUrl).toBe("https://football365.com/author/editorf365");
  });

  it("maps Joe Williams slug and recognises plain name", () => {
    const fromUrl = normalizeAuthorIdentity("https://football365.com/author/joe-williams", brand);
    const fromName = normalizeAuthorIdentity("joe williams", brand);
    expect(fromUrl?.displayName).toBe("Joe Williams");
    expect(fromName?.displayName).toBe("Joe Williams");
    expect(fromUrl?.canonicalSlug).toBe("joe-williams");
    expect(fromName?.canonicalSlug).toBe("joe-williams");
  });

  it("maps David Tindall / davidt", () => {
    const fromUrl = normalizeAuthorIdentity("//www.Football365.com/author/davidt", brand);
    const fromName = normalizeAuthorIdentity("David Tindall", brand);
    expect(fromUrl?.displayName).toBe("David Tindall");
    expect(fromName?.canonicalSlug).toBe("davidt");
    expect(journalistIdentityKey(brand, fromUrl!), journalistIdentityKey(brand, fromName!));
    expect(journalistIdentityKey(brand, fromUrl!)).toBe(`football365::slug::davidt`);
  });

  it("title-cases unknown plain names", () => {
    const id = normalizeAuthorIdentity("jane smith-jones");
    expect(id?.displayName).toBe("Jane Smith-jones");
    expect(id?.canonicalSlug).toBe("jane-smith-jones");
  });

  it("rejects empty, No author label, author-less homepage URLs", () => {
    expect(normalizeAuthorIdentity("")).toBeNull();
    expect(normalizeAuthorIdentity("   ")).toBeNull();
    expect(normalizeAuthorIdentity("no author")).toBeNull();
    expect(normalizeAuthorIdentity("NO AUTHOR")).toBeNull();
    expect(normalizeAuthorIdentity("https://www.football365.com/")).toBeNull();
  });
});

describe("journalistIdentityKey / dedupe", () => {
  it("Uses same dedupe key for URL-as-author and display name", () => {
    expect(
      journalistIdentityKeyFromRaw(brand, "https://www.football365.com/author/joe-williams"),
    ).toBe(journalistIdentityKeyFromRaw(brand, "Joe Williams"));
    expect(journalistIdentityKeyFromRaw(brand, "https://www.football365.com/author/editorf365")).toBe(
      journalistIdentityKeyFromRaw(brand, "Editor F365"),
    );
  });
});

describe("mergeProfilesByIdentity", () => {
  it("Keeps oldest id and merges fields; prefers human-readable name over URL", () => {
    const oldest: LanguageJournalistProfile = {
      id: "old-id",
      name: "Joe Williams",
      brand,
      sports: ["Football"],
      styleNotes: "A",
      articleGuidelines: "G",
      exampleTitles: ["t1"],
      sampleArticleIds: ["a1"],
      source: "imported",
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const newest: LanguageJournalistProfile = {
      id: "new-id",
      name: "https://www.football365.com/author/joe-williams",
      brand,
      sports: ["Football"],
      styleNotes: "B",
      articleGuidelines: "G2",
      exampleTitles: ["t2"],
      sampleArticleIds: ["a2"],
      source: "imported",
      active: false,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-03T00:00:00.000Z",
    };
    const merged = mergeProfilesByIdentity([oldest, newest]);
    expect(merged.id).toBe("old-id");
    expect(merged.name).toBe("Joe Williams");
    expect(merged.sampleArticleIds.sort()).toEqual(["a1", "a2"]);
    expect(merged.exampleTitles.sort()).toEqual(["t1", "t2"]);
    expect(merged.styleNotes).toBe("B");
    expect(merged.updatedAt.startsWith("2026-02-03")).toBe(true);
    expect(merged.active).toBe(false);
  });
});

describe("mergeTwoJournalistDisplayNames", () => {
  it("prefers readable label over URL", () => {
    expect(
      mergeTwoJournalistDisplayNames(
        "https://www.football365.com/author/davidt",
        "David Tindall",
        brand,
      ),
    ).toBe("David Tindall");
  });
});
