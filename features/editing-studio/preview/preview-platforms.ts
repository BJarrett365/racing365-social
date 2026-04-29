import type { PlatformType } from "@/features/editing-studio/types/domain";

/** All platforms supported by the live preview switcher (order matters). */
export const PREVIEW_PLATFORM_ORDER: readonly PlatformType[] = [
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

export function previewPlatformLabel(p: PlatformType): string {
  switch (p) {
    case "instagram":
      return "Instagram Feed";
    case "instagram_story":
      return "Instagram Story";
    case "youtube_shorts":
      return "YouTube Shorts";
    case "x":
      return "X";
    default:
      return p
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

/** Vertical / full-bleed formats that show safe-zone guides in preview. */
export function previewUsesSafeZone(p: PlatformType): boolean {
  return p === "instagram_story" || p === "tiktok" || p === "youtube_shorts";
}
