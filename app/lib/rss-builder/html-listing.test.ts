import { describe, expect, it } from "vitest";
import {
  extractHtmlListingToRssChannelItems,
  looksLikeHtmlDocument,
  resolveBodyToRssChannel,
} from "@/app/lib/rss-builder/html-listing";

describe("looksLikeHtmlDocument", () => {
  it("detects doctype html", () => {
    expect(looksLikeHtmlDocument("<!DOCTYPE html><html>")).toBe(true);
  });
  it("detects html root", () => {
    expect(looksLikeHtmlDocument("  <html lang=\"en\">")).toBe(true);
  });
  it("rejects bare rss", () => {
    expect(looksLikeHtmlDocument("<rss version=\"2.0\"><channel></channel></rss>")).toBe(false);
  });
});

describe("extractHtmlListingToRssChannelItems", () => {
  it("collects same-domain article-like links", () => {
    const html = `<!DOCTYPE html><html><head><title>Hub</title></head><body>
      <a href="/news/first-story">Alpha headline is long enough</a>
      <a href="https://example.com/news/second-one">Second story title here</a>
      <a href="https://other.com/x">External</a>
      <a href="/search?q=x">Search</a>
    </body></html>`;
    const { channelTitle, items } = extractHtmlListingToRssChannelItems(html, "https://example.com/section/", 25);
    expect(channelTitle).toContain("Hub");
    expect(items).toHaveLength(2);
    expect(items[0]?.link).toContain("example.com");
    expect(items.every((i) => i.guid === i.link)).toBe(true);
  });
});

describe("resolveBodyToRssChannel", () => {
  it("prefers RSS when items exist", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
      <item><title>One</title><link>https://example.com/a</link></item>
    </channel></rss>`;
    const { items } = resolveBodyToRssChannel(xml, "https://example.com/feed.xml", 10);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("One");
  });

  it("falls back to HTML when no RSS items", () => {
    const html = `<!DOCTYPE html><html><head><title>Index</title></head><body>
      <a href="/news/foo-bar-baz-qux">Interesting article about sports today</a>
    </body></html>`;
    const { items, channelTitle } = resolveBodyToRssChannel(html, "https://example.com/", 10);
    expect(channelTitle).toContain("Index");
    expect(items).toHaveLength(1);
    expect(items[0]?.link).toMatch(/news\/foo/);
  });
});
