import { describe, expect, it } from "vitest";
import {
  extractHeroImageFromArticleHtml,
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

  it("Sporting Life: keeps /news/{slug}/{id} only, drops nav hubs", () => {
    const html = `<!DOCTYPE html><html><head><title>Racing News</title></head><body>
      <a href="https://www.sportinglife.com/racing/racecards">Racecards</a>
      <a href="https://www.sportinglife.com/racing/fast-results">Fast Results</a>
      <a href="https://www.sportinglife.com/racing/news">Horse Racing</a>
      <a href="https://www.sportinglife.com/racing/news/horse-racing/231830">Horse Racing 3h ago Maltese Cross wins trial</a>
      <a href="https://www.sportinglife.com/football/news/world-cup/999001">Football 1d ago Final drama in Doha</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 25);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.link)).toEqual(
      expect.arrayContaining([
        "https://www.sportinglife.com/racing/news/horse-racing/231830",
        "https://www.sportinglife.com/football/news/world-cup/999001",
      ]),
    );
  });

  it("attaches og:image from listing page to HTML-sourced items", () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:image" content="//cdn.example.com/hero.jpg" />
      <title>News</title>
    </head><body>
      <a href="https://www.sportinglife.com/racing/news/story-one/111">Horse Racing long headline for the trial today</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items).toHaveLength(1);
    expect(items[0]?.imageUrl).toBe("https://cdn.example.com/hero.jpg");
  });

  it("prefers thumbnail inside the anchor over listing og:image", () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:image" content="https://cdn.example.com/hero.jpg" />
      <title>News</title>
    </head><body>
      <a href="https://www.sportinglife.com/racing/news/story-one/111"><img src="/thumb/card1.jpg" alt="" /> Horse Racing long headline for the trial today</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items[0]?.imageUrl).toBe("https://www.sportinglife.com/thumb/card1.jpg");
  });

  it("Sporting Life: finds /images/news/… CDN URL in card markup", () => {
    const img = "https://www.sportinglife.com/images/news/1800x1013/8a1cd73d-8456-4d93-959e-f77c2821bcd7.jpg";
    const html = `<!DOCTYPE html><html><head><title>News</title></head><body>
      <a href="https://www.sportinglife.com/racing/news/story-one/111">Horse Racing long headline for the trial today</a>
      <img src="${img}" alt="" />
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items[0]?.imageUrl).toBe(img);
  });

  it("Sporting Life: finds CDN URL inside anchor body (plain or attribute)", () => {
    const img = "https://www.sportinglife.com/images/news/640x360/8a1cd73d-8456-4d93-959e-f77c2821bcd7.jpg";
    const html = `<!DOCTYPE html><html><head><title>News</title></head><body>
      <a href="https://www.sportinglife.com/racing/news/story-one/111" data-bg="${img}">Horse Racing long headline for the trial today</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items[0]?.imageUrl).toBe(img);
  });

  it("Sporting Life: fills from __NEXT_DATA__ when anchors are only hub links (shareUrl + headline)", () => {
    const story = {
      shareUrl: "https://www.sportinglife.com/racing/news/horse-racing/231830",
      headline: "Maltese Cross wins trial with a dominant performance today",
      thumbnail: "https://www.sportinglife.com/images/news/640x360/8a1cd73d-8456-4d93-959e-f77c2821bcd7.jpg",
    };
    const json = JSON.stringify({ props: { pageProps: { stories: [story] } } });
    const html = `<!DOCTYPE html><html><head><title>Racing News</title></head><body>
      <a href="https://www.sportinglife.com/racing/news">Horse Racing hub navigation text here</a>
      <script id="__NEXT_DATA__" type="application/json">${json}</script>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 25);
    expect(items).toHaveLength(1);
    expect(items[0]?.link).toBe("https://www.sportinglife.com/racing/news/horse-racing/231830");
    expect(items[0]?.title).toContain("Maltese Cross");
    expect(items[0]?.imageUrl).toContain("sportinglife.com/images/news/");
  });

  it("dedupes __NEXT_DATA__ entries that duplicate anchor URLs (Sporting Life)", () => {
    const u = "https://www.sportinglife.com/racing/news/horse-racing/231830";
    const json = JSON.stringify({
      props: {
        pageProps: {
          stories: [{ url: u, title: "Duplicate title from JSON payload only", image: "https://cdn.example.com/json.jpg" }],
        },
      },
    });
    const html = `<!DOCTYPE html><html><head><title>News</title></head><body>
      <script id="__NEXT_DATA__" type="application/json">${json}</script>
      <a href="${u}">Maltese Cross wins trial with enough words in the anchor title</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toContain("Maltese Cross");
  });

  it("extracts stories from __NEXT_DATA__ when the page has no article <a> links (Next.js listings)", () => {
    const story = {
      url: "https://www.racingpost.com/news/previews/seconds-out-for-the-latest-chapter-aO55r7v5j1aC",
      title: "Seconds out for the latest chapter in an improbable rivalry today",
      image: "https://cdn.example.com/racing-post-card.jpg",
    };
    const json = JSON.stringify({ props: { pageProps: { articles: [story] } } });
    const html = `<!DOCTYPE html><html><head><title>Latest News</title></head><body>
      <div id="__next"></div>
      <script id="__NEXT_DATA__" type="application/json">${json}</script>
    </body></html>`;
    const { items, channelTitle } = extractHtmlListingToRssChannelItems(html, "https://www.racingpost.com/news/", 25);
    expect(items).toHaveLength(1);
    expect(items[0]?.link).toContain("racingpost.com/news/previews/");
    expect(items[0]?.title).toContain("Seconds out");
    expect(items[0]?.imageUrl).toBe("https://cdn.example.com/racing-post-card.jpg");
    expect(channelTitle).toContain("Latest News");
  });

  it("uses __NEXT_DATA__ image when anchor has no thumbnail", () => {
    const json = JSON.stringify({
      props: {
        pageProps: {
          stories: [{ link: "/racing/news/story-one/111", image: "https://cdn.example.com/from-next.jpg" }],
        },
      },
    });
    const html = `<!DOCTYPE html><html><head><title>News</title></head><body>
      <script id="__NEXT_DATA__" type="application/json">${json}</script>
      <a href="https://www.sportinglife.com/racing/news/story-one/111">Horse Racing long headline for the trial today</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items[0]?.imageUrl).toBe("https://cdn.example.com/from-next.jpg");
  });

  it("Sporting Life: drops /news/contact/… style utility URLs", () => {
    const html = `<!DOCTYPE html><html><head><title>Racing News</title></head><body>
      <a href="https://www.sportinglife.com/racing/news/contact/99999">Contact us for help anytime</a>
      <a href="https://www.sportinglife.com/racing/news/horse-racing/231830">Horse Racing 3h ago Maltese Cross wins trial</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 25);
    expect(items).toHaveLength(1);
    expect(items[0]?.link).toContain("231830");
  });

  it("drops footer-style anchor titles such as Contact Us", () => {
    const longSlugA = "aaa-really-long-slug-for-contact-us-trap-page-only-here";
    const longSlugB = "bbb-long-slug-for-real-headline-testing-purpose-today";
    const html = `<!DOCTYPE html><html><head><title>Hub</title></head><body>
      <a href="https://example.com/news/${longSlugA}">Contact Us</a>
      <a href="https://example.com/news/${longSlugB}">This is a real headline for the sports section today</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://example.com/news/", 25);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toContain("real headline");
    expect(items[0]?.link).toContain(longSlugB);
  });

  it("uses JSON-LD NewsArticle image when anchor has no thumbnail", () => {
    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      url: "https://www.sportinglife.com/racing/news/story-one/111",
      image: "https://cdn.example.com/ld-hero.jpg",
    });
    const html = `<!DOCTYPE html><html><head><title>News</title></head><body>
      <script type="application/ld+json">${ld}</script>
      <a href="https://www.sportinglife.com/racing/news/story-one/111">Horse Racing long headline for the trial today</a>
    </body></html>`;
    const { items } = extractHtmlListingToRssChannelItems(html, "https://www.sportinglife.com/racing/news", 10);
    expect(items[0]?.imageUrl).toBe("https://cdn.example.com/ld-hero.jpg");
  });
});

describe("extractHeroImageFromArticleHtml", () => {
  it("returns og:image when present", () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:image" content="https://cdn.example.com/og.jpg" />
    </head><body></body></html>`;
    expect(extractHeroImageFromArticleHtml(html, "https://www.sportinglife.com/racing/news/foo/1")).toBe(
      "https://cdn.example.com/og.jpg",
    );
  });

  it("falls back to Sporting Life CDN in body", () => {
    const u = "https://www.sportinglife.com/images/news/800x450/8a1cd73d-8456-4d93-959e-f77c2821bcd7.jpg";
    const html = `<!DOCTYPE html><html><head><title>x</title></head><body><script>var x=1</script><p>${u}</p></body></html>`;
    expect(extractHeroImageFromArticleHtml(html, "https://www.sportinglife.com/racing/news/foo/1")).toBe(u);
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
