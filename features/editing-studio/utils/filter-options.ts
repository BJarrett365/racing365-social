import type { ContentType, EditingProjectStatus, PlatformType } from "@/features/editing-studio/types/domain";

export const EDITING_STUDIO_STATUS_FILTERS: readonly EditingProjectStatus[] = [
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;

export const EDITING_STUDIO_CONTENT_TYPE_FILTERS: readonly ContentType[] = [
  "link_post",
  "image_post",
  "video_post",
  "story_post",
  "article_promo",
  "shorts_promo",
] as const;

export const EDITING_STUDIO_PLATFORM_FILTERS: readonly PlatformType[] = [
  "facebook",
  "x",
  "instagram",
  "instagram_story",
  "linkedin",
  "tiktok",
  "youtube_shorts",
  "whatsapp",
  "telegram",
] as const;
