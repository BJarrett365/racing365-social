import { describe, expect, it } from "vitest";
import { collectFeedCrawlUrls, splitFeedSourceUrls } from "@/app/lib/rss-builder/feed-sources";

describe("splitFeedSourceUrls", () => {
  it("splits on newlines and trims", () => {
    expect(splitFeedSourceUrls(" a \n\n b ")).toEqual(["a", "b"]);
  });
  it("returns empty for blank", () => {
    expect(splitFeedSourceUrls("  ")).toEqual([]);
  });
});

describe("collectFeedCrawlUrls", () => {
  it("merges source_url and manual_urls for rss_url", () => {
    const urls = collectFeedCrawlUrls({
      source_type: "rss_url",
      source_url: "https://a.com/1\nhttps://a.com/2",
      manual_urls: "https://b.com/x",
    });
    expect(urls).toEqual(["https://a.com/1", "https://a.com/2", "https://b.com/x"]);
  });

  it("dedupes preserving order", () => {
    const urls = collectFeedCrawlUrls({
      source_type: "site_url",
      source_url: "https://x.com/a",
      manual_urls: "https://x.com/a\nhttps://y.com/b",
    });
    expect(urls).toEqual(["https://x.com/a", "https://y.com/b"]);
  });

  it("manual_urls type prefers manual field", () => {
    expect(
      collectFeedCrawlUrls({
        source_type: "manual_urls",
        source_url: "https://ignored.example/",
        manual_urls: "https://one.com\nhttps://two.com",
      }),
    ).toEqual(["https://one.com", "https://two.com"]);
  });

  it("manual_urls falls back to source_url when manual empty", () => {
    expect(
      collectFeedCrawlUrls({
        source_type: "manual_urls",
        source_url: "https://only.com",
        manual_urls: null,
      }),
    ).toEqual(["https://only.com"]);
  });

  it("throws when nothing to crawl", () => {
    expect(() =>
      collectFeedCrawlUrls({ source_type: "rss_url", source_url: null, manual_urls: null }),
    ).toThrow();
  });
});
