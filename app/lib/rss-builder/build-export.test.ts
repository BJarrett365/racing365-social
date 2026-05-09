import { describe, expect, it } from "vitest";
import { buildRss2ChannelXml } from "@/app/lib/rss-builder/build-export";

describe("buildRss2ChannelXml", () => {
  it("emits MRSS namespaces and mirrors image_url to enclosure + media:content", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/rss.xml",
      includeImages: true,
      includeMediaEnclosure: true,
      includeThumbnailInDescription: true,
      items: [
        {
          title: "One",
          link: "https://example.com/a",
          guid: "g:a",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>Summary</p>",
          imageUrl: "https://www.sportinglife.com/images/news/1800x1013/uuid.jpg",
          enclosureUrl: null,
        },
      ],
    });
    expect(xml).toContain('xmlns:media="http://search.yahoo.com/mrss/"');
    expect(xml).toContain("<media:content ");
    expect(xml).toContain('medium="image"');
    expect(xml).toContain("<enclosure ");
    expect(xml).toContain("https://www.sportinglife.com/images/news/1800x1013/uuid.jpg");
    expect(xml).toContain("type=\"image/jpeg\"");
    expect(xml).toContain("<img src=");
    expect(xml).toContain("width: 100%");
  });

  it("uses image/webp for webp URLs", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/rss.xml",
      includeImages: true,
      includeMediaEnclosure: true,
      includeThumbnailInDescription: false,
      items: [
        {
          title: "W",
          link: "https://example.com/w",
          guid: "g:w",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>x</p>",
          imageUrl: "https://cdn.example.com/x.webp",
          enclosureUrl: null,
        },
      ],
    });
    expect(xml).toContain("type=\"image/webp\"");
    expect(xml).not.toContain("<img ");
  });

  it("skips image extras when includeImages is false", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/rss.xml",
      includeImages: false,
      includeMediaEnclosure: true,
      includeThumbnailInDescription: true,
      items: [
        {
          title: "One",
          link: "https://example.com/a",
          guid: "g:a",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>Summary</p>",
          imageUrl: "https://example.com/h.jpg",
          enclosureUrl: null,
        },
      ],
    });
    expect(xml).not.toContain("<enclosure ");
    expect(xml).not.toContain("<media:content ");
    expect(xml).not.toContain("<img ");
  });

  it("still emits enclosure from enclosure_url when includeImages is false", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/rss.xml",
      includeImages: false,
      includeMediaEnclosure: true,
      includeThumbnailInDescription: true,
      items: [
        {
          title: "Pod",
          link: "https://example.com/p",
          guid: "g:p",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>x</p>",
          imageUrl: null,
          enclosureUrl: "https://example.com/audio.mp3",
        },
      ],
    });
    expect(xml).toContain("<enclosure ");
    expect(xml).toContain("audio.mp3");
    expect(xml).not.toContain("<media:content ");
  });
});
