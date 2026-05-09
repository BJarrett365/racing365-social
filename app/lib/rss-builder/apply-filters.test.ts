import { describe, expect, it } from "vitest";
import { applyRssFilters, prepareItems } from "@/app/lib/rss-builder/apply-filters";
import type { RssChannelItem, RssFilterConfig } from "@/app/lib/rss-builder/types";

function item(partial: Partial<RssChannelItem>): RssChannelItem {
  return {
    title: "",
    link: "",
    guid: "",
    descriptionHtml: "",
    imageUrl: "",
    enclosureUrl: "",
    publishedRaw: "",
    ...partial,
  };
}

describe("applyRssFilters", () => {
  it("drops items with http links when hideNoSecureLink", () => {
    const prepared = prepareItems([
      item({ title: "A", link: "http://insecure.test/x", guid: "1", publishedRaw: "2024-01-01" }),
      item({ title: "B", link: "https://secure.test/y", guid: "2", publishedRaw: "2024-01-02" }),
    ]);
    const config: RssFilterConfig = { hideNoSecureLink: true };
    const out = applyRssFilters(prepared, config, new Set());
    expect(out.map((r) => r.title)).toEqual(["B"]);
  });

  it("respects blocked domains set", () => {
    const prepared = prepareItems([
      item({ title: "On blocked", link: "https://blocked.com/p", guid: "1", publishedRaw: "2024-01-01" }),
      item({ title: "Ok", link: "https://ok.com/p", guid: "2", publishedRaw: "2024-01-02" }),
    ]);
    const out = applyRssFilters(prepared, {}, new Set(["blocked.com"]));
    expect(out.map((r) => r.title)).toEqual(["Ok"]);
  });
});
