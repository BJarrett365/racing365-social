import { describe, expect, it } from "vitest";
import { extractFirstImageSrcFromHtml, resolvePreviewImageUrl, urlLooksLikeImage } from "@/app/lib/rss-builder/preview-image";

describe("urlLooksLikeImage", () => {
  it("accepts Sporting Life news CDN paths", () => {
    expect(
      urlLooksLikeImage("https://www.sportinglife.com/images/news/1800x1013/8a1cd73d-8456-4d93-959e-f77c2821bcd7.jpg"),
    ).toBe(true);
  });

  it("accepts Next image optimizer URLs", () => {
    expect(urlLooksLikeImage("https://www.sportinglife.com/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fx.jpg&w=640")).toBe(
      true,
    );
  });
});

describe("resolvePreviewImageUrl", () => {
  it("prefers image_url", () => {
    expect(
      resolvePreviewImageUrl({
        image_url: "https://cdn.example.com/hero.jpg",
        enclosure_url: "https://cdn.example.com/other.webp",
        description_html: '<p><img src="https://cdn.example.com/desc.png" /></p>',
      }),
    ).toBe("https://cdn.example.com/hero.jpg");
  });

  it("falls back to first img in description", () => {
    expect(
      resolvePreviewImageUrl({
        image_url: null,
        enclosure_url: null,
        description_html: '<p><img src="https://cdn.example.com/in-desc.jpg" /></p><p>More</p>',
      }),
    ).toBe("https://cdn.example.com/in-desc.jpg");
  });

  it("falls back to data-src in description", () => {
    expect(
      resolvePreviewImageUrl({
        image_url: "",
        enclosure_url: null,
        description_html: '<div data-src="https://cdn.example.com/lazy.webp"></div>',
      }),
    ).toBe("https://cdn.example.com/lazy.webp");
  });

  it("uses enclosure when image-like and no column or description img", () => {
    expect(
      resolvePreviewImageUrl({
        image_url: null,
        enclosure_url: "https://www.sportinglife.com/images/news/640x360/u.jpg",
        description_html: "<p>No img here</p>",
      }),
    ).toBe("https://www.sportinglife.com/images/news/640x360/u.jpg");
  });

  it("ignores non-image enclosure", () => {
    expect(
      resolvePreviewImageUrl({
        image_url: null,
        enclosure_url: "https://example.com/podcast/episode.mp3",
        description_html: "<p>x</p>",
      }),
    ).toBe("");
  });
});

describe("extractFirstImageSrcFromHtml", () => {
  it("returns empty for blank", () => {
    expect(extractFirstImageSrcFromHtml("")).toBe("");
  });
});
