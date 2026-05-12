import { describe, expect, it } from "vitest";
import { parseRssXmlToChannel } from "@/app/lib/rss-builder/parse-rss";

describe("parseRssXmlToChannel", () => {
  it("parses RSS 2.0 channel and items", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Channel</title>
    <link>https://example.com</link>
    <item>
      <title>Hello &amp; world</title>
      <link>https://example.com/a</link>
      <guid>g1</guid>
      <description><![CDATA[<p>Body</p>]]></description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const { channelTitle, items } = parseRssXmlToChannel(xml);
    expect(channelTitle).toBe("Test Channel");
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain("Hello");
    expect(items[0].link).toBe("https://example.com/a");
    expect(items[0].descriptionHtml).toContain("Body");
  });

  it("strips stray CDATA close markers from descriptions (partner RSS quirks)", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>ATR</title>
    <item>
      <title>T</title>
      <link>https://www.attheraces.com/news/x</link>
      <guid>g-cdata</guid>
      <description>Ed Dunlop's filly has already won the Italian Guineas. ]]></description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const { items } = parseRssXmlToChannel(xml);
    expect(items[0].descriptionHtml).not.toContain("]]>");
    expect(items[0].descriptionHtml).toContain("Italian Guineas");
  });
});
