import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PreparedItem } from "@/app/lib/rss-builder/apply-filters";

vi.mock("@/app/lib/rss-builder/fetch-source", () => ({
  fetchArticlePageBody: vi.fn(),
}));

import { fetchArticlePageBody } from "@/app/lib/rss-builder/fetch-source";
import { hydrateMissingArticleHeroImages } from "@/app/lib/rss-builder/hydrate-article-images";

function baseItem(link: string, imageUrl: string): PreparedItem {
  return {
    title: "T",
    link,
    guid: "g",
    descriptionHtml: "<p>x</p>",
    imageUrl,
    enclosureUrl: "",
    publishedRaw: "",
    sourceDomain: "example.com",
    publishedAt: null,
  };
}

describe("hydrateMissingArticleHeroImages", () => {
  beforeEach(() => {
    vi.mocked(fetchArticlePageBody).mockReset();
  });

  it("fetches article HTML and sets imageUrl from og:image", async () => {
    vi.mocked(fetchArticlePageBody).mockResolvedValue(
      '<html><head><meta property="og:image" content="https://cdn.example.com/hero.jpg"/></head></html>',
    );
    const items: PreparedItem[] = [baseItem("https://www.sportinglife.com/racing/news/foo/1", "")];
    const out = await hydrateMissingArticleHeroImages(items, { maxFetches: 5 });
    expect(out[0]?.imageUrl).toBe("https://cdn.example.com/hero.jpg");
    expect(fetchArticlePageBody).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite existing imageUrl", async () => {
    vi.mocked(fetchArticlePageBody).mockResolvedValue(
      '<html><head><meta property="og:image" content="https://cdn.example.com/other.jpg"/></head></html>',
    );
    const items: PreparedItem[] = [baseItem("https://example.com/a", "https://cdn.example.com/existing.jpg")];
    const out = await hydrateMissingArticleHeroImages(items);
    expect(out[0]?.imageUrl).toBe("https://cdn.example.com/existing.jpg");
    expect(fetchArticlePageBody).not.toHaveBeenCalled();
  });
});
