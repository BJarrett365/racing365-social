import { describe, expect, it } from "vitest";
import { parseLoopFeedPreviewItems } from "@/app/lib/data-studio/loop-feed-preview";

describe("loop-feed-preview", () => {
  it("parses YouTube highlight items with title and thumbnail", () => {
    const json = [
      {
        id: "abc",
        externalId: "lKMOJxcEGhw",
        service: "youtube",
        type: "video",
        title: "Leeds 1-0 Brighton | Premier League highlights",
        text: "Highlights from our game<br/>#lufc",
        url: "https://www.youtube.com/watch?v=lKMOJxcEGhw",
        date: "2026-05-17T20:53:06Z",
        media: [{ type: "image", url: "https://i.ytimg.com/vi/lKMOJxcEGhw/maxresdefault.jpg" }],
        author: { name: "Leeds United Official", image: "https://example.com/avatar.jpg" },
      },
    ];
    const items = parseLoopFeedPreviewItems(json, "Leeds United", 10);
    expect(items).toHaveLength(1);
    expect(items[0]?.platform).toBe("YouTube");
    expect(items[0]?.youtubeVideoId).toBe("lKMOJxcEGhw");
    expect(items[0]?.title).toContain("Leeds");
    expect(items[0]?.textPlain).not.toContain("<br");
  });
});
