import { describe, expect, it } from "vitest";
import {
  filterLoopFeedTeamsByFeedType,
  groupLoopFeedTeams,
  type LoopFeedTeamRow,
} from "@/app/lib/tools/loop-feed-teams-store";

const sample: LoopFeedTeamRow[] = [
  {
    id: "a",
    name: "Arsenal",
    feedType: "commentaries",
    topicUrl: "https://q.loop-feed.com/v1/topic/a/content",
    active: true,
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
  {
    id: "b",
    name: "Arsenal",
    feedType: "news",
    topicUrl: "",
    active: false,
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
];

describe("loop-feed-teams-store", () => {
  it("filters active teams with URLs by feed type", () => {
    expect(filterLoopFeedTeamsByFeedType(sample, "commentaries")).toHaveLength(1);
    expect(filterLoopFeedTeamsByFeedType(sample, "news")).toHaveLength(0);
  });

  it("groups teams by club with four feed slots", () => {
    const groups = groupLoopFeedTeams(sample);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("Arsenal");
    expect(groups[0]?.feeds.commentaries?.id).toBe("a");
    expect(groups[0]?.feeds.match_highlights).toBeUndefined();
    expect(groups[0]?.feeds.news?.id).toBe("b");
  });
});
