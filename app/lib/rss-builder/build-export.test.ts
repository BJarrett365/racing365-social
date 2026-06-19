import { XMLParser, XMLValidator } from "fast-xml-parser";
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
    expect(xml).toContain('medium="audio"');
  });

  it("escapes literal ]]> inside description CDATA", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/rss.xml",
      includeImages: false,
      includeMediaEnclosure: false,
      includeThumbnailInDescription: false,
      items: [
        {
          title: "Bad",
          link: "https://example.com/a",
          guid: "g:a",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<script>evil]]>more</script>",
        },
      ],
    });
    expect(xml).toContain("]]]]><![CDATA[>");
    expect(XMLValidator.validate(xml)).toBe(true);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const desc = parsed?.rss?.channel?.item?.description;
    expect(String(desc)).toContain("evil]]>more");
  });

  it("honours selfLinkType on atom:link self", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/out.xml?format=xml",
      selfLinkType: "application/xml",
      includeImages: false,
      includeMediaEnclosure: false,
      includeThumbnailInDescription: false,
      items: [
        {
          title: "One",
          link: "https://example.com/a",
          guid: "g:a",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>x</p>",
        },
      ],
    });
    expect(xml).toContain('type="application/xml"');
    expect(xml).toContain('href="https://example.com/out.xml?format=xml"');
  });

  it("uses audio/mpeg for mp3 enclosures and emits MRSS medium=audio", () => {
    const xml = buildRss2ChannelXml({
      channelTitle: "T",
      channelLink: "https://example.com/",
      channelDescription: "D",
      selfLink: "https://example.com/rss.xml",
      includeImages: false,
      includeMediaEnclosure: true,
      includeThumbnailInDescription: false,
      items: [
        {
          title: "Pod",
          link: "https://example.com/p",
          guid: "g:p",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>x</p>",
          imageUrl: null,
          enclosureUrl: "https://example.com/ep.mp3",
        },
      ],
    });
    expect(xml).toContain('type="audio/mpeg"');
    expect(xml).toContain('medium="audio"');
  });

  it("emits MRSS medium=video for mp4 enclosures", () => {
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
          title: "Clip",
          link: "https://example.com/v",
          guid: "g:v",
          pubDate: "Sat, 01 Jan 2022 00:00:00 GMT",
          descriptionHtml: "<p>x</p>",
          imageUrl: "https://example.com/thumb.jpg",
          enclosureUrl: "https://example.com/clip.mp4",
        },
      ],
    });
    expect(xml).toContain('medium="video"');
    expect(xml).toContain('type="video/mp4"');
  });
});
