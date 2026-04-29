import type { ContentType, EditingProjectStatus, PlatformType } from "@/features/editing-studio/types/domain";

const STATUS: Record<EditingProjectStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const PLATFORM: Record<PlatformType, string> = {
  facebook: "Facebook",
  x: "X",
  instagram: "Instagram",
  instagram_story: "Instagram Story",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const CONTENT: Record<ContentType, string> = {
  link_post: "Link post",
  image_post: "Image post",
  video_post: "Video post",
  story_post: "Story post",
  article_promo: "Article promo",
  shorts_promo: "Shorts promo",
};

export function formatStatusLabel(s: EditingProjectStatus): string {
  return STATUS[s] ?? s;
}

export function formatPlatformLabel(p: PlatformType): string {
  return PLATFORM[p] ?? p;
}

export function formatContentTypeLabel(c: ContentType): string {
  return CONTENT[c] ?? c;
}
