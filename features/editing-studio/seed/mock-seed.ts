import type { EditingStudioStoreV2 } from "@/features/editing-studio/types/domain";

/**
 * Deterministic mock data for local testing when the store file is empty.
 * Not committed to git — applied at runtime into data/local/editing-studio-store.json.
 */
export function buildMockEditingStudioStore(): EditingStudioStoreV2 {
  const t0 = "2026-01-10T09:00:00.000Z";
  const t1 = "2026-01-12T14:30:00.000Z";
  const t2 = "2026-01-14T11:15:00.000Z";
  const t3 = "2026-01-18T16:00:00.000Z";
  const t4 = "2026-01-20T08:00:00.000Z";

  return {
    version: 2,
    projects: {
      "ed-seed-article-001": {
        id: "ed-seed-article-001",
        title: "Weekend football — article promo (seed)",
        brand: "Football365",
        thumbnailRel: "images/library/demo-article/hero.png",
        description: "Promo copy for long-form article across X and Facebook.",
        status: "in_review",
        contentType: "article_promo",
        platforms: ["x", "facebook", "linkedin"],
        revision: 3,
        assets: [
          {
            id: "asset-seed-1",
            kind: "image",
            label: "Hero still",
            relPath: "images/library/demo-article/hero.png",
            mimeType: "image/png",
            meta: { width: 1200, height: 630 },
            createdAt: t0,
            updatedAt: t1,
          },
          {
            id: "asset-seed-2",
            kind: "link",
            label: "Source article",
            url: "https://example.com/article/weekend-wrap",
            createdAt: t0,
            updatedAt: t0,
          },
        ],
        copyVariants: [
          {
            id: "cv-seed-1",
            platform: "x",
            headline: "Ten talking points from the weekend",
            body: "We unpack the key stories — thread below.",
            linkUrl: "https://example.com/article/weekend-wrap",
            hashtags: ["#football", "#analysis"],
            revision: 3,
            createdAt: t0,
            updatedAt: t2,
          },
          {
            id: "cv-seed-2",
            platform: "facebook",
            headline: "Weekend football — full analysis",
            body: "Read the conclusions and debate the big calls.",
            cta: "Read more",
            linkUrl: "https://example.com/article/weekend-wrap",
            revision: 2,
            createdAt: t0,
            updatedAt: t1,
          },
        ],
        integrationMeta: { cms: "placeholder", campaignId: "cmp-seed-1" },
        createdAt: t0,
        updatedAt: t2,
      },
      "ed-seed-shorts-002": {
        id: "ed-seed-shorts-002",
        title: "Shorts clip — TikTok / YT Shorts (seed)",
        brand: "Planet Sport",
        description: "Vertical promo for short-form video.",
        status: "draft",
        contentType: "shorts_promo",
        platforms: ["tiktok", "youtube_shorts", "instagram"],
        revision: 1,
        assets: [
          {
            id: "asset-seed-3",
            kind: "video",
            label: "15s cut",
            relPath: "video/seed-shorts-preview.mp4",
            mimeType: "video/mp4",
            byteSize: 1_200_000,
            createdAt: t1,
            updatedAt: t1,
          },
        ],
        copyVariants: [
          {
            id: "cv-seed-3",
            platform: "tiktok",
            headline: "You need to see this finish",
            body: "Full replay on site — link in bio.",
            revision: 1,
            createdAt: t1,
            updatedAt: t1,
          },
        ],
        createdAt: t1,
        updatedAt: t1,
      },
      "ed-seed-archived-003": {
        id: "ed-seed-archived-003",
        title: "Archived campaign example (seed)",
        brand: "Racing365",
        status: "archived",
        contentType: "link_post",
        platforms: ["telegram", "whatsapp"],
        revision: 5,
        assets: [],
        copyVariants: [],
        archivedAt: t2,
        createdAt: t0,
        updatedAt: t2,
      },
      "ed-seed-scheduled-004": {
        id: "ed-seed-scheduled-004",
        title: "Monday briefing — go-live scheduled (seed)",
        brand: "Racing365",
        status: "scheduled",
        contentType: "link_post",
        platforms: ["linkedin", "x"],
        revision: 2,
        scheduledAt: "2026-02-01T08:00:00.000Z",
        assets: [],
        copyVariants: [],
        createdAt: t3,
        updatedAt: t3,
      },
      "ed-seed-published-005": {
        id: "ed-seed-published-005",
        title: "Derby recap — live on social (seed)",
        brand: "Football365",
        status: "published",
        contentType: "article_promo",
        platforms: ["facebook", "instagram", "x"],
        revision: 4,
        publishedAt: t4,
        assets: [],
        copyVariants: [],
        createdAt: t0,
        updatedAt: t4,
      },
    },
    exports: {
      "exp-seed-1": {
        id: "exp-seed-1",
        projectId: "ed-seed-article-001",
        format: "json",
        revision: 3,
        payload: { snapshot: "placeholder" },
        source: "seed",
        createdAt: t2,
      },
    },
    revisions: {},
    revisionIdsByProject: {},
  };
}
