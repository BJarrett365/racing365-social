export type RssFeedSourceType = "rss_url" | "site_url" | "manual_urls" | "topic" | "sitemap";

export type RssFeedStatus = "active" | "paused" | "failed";

export type RssCrawlFrequency = "25m" | "30m" | "1h" | "24h";

export type RssItemStatus = "visible" | "hidden" | "blocked";

export type RssTranslationProvider = "deepl" | "google" | "openai";

/** Stored in rss_feed_filters.config */
export type RssFilterConfig = {
  hideNoImage?: boolean;
  hideNoDescription?: boolean;
  hideNoDate?: boolean;
  hideNoSecureLink?: boolean;
  hideDuplicateDescriptions?: boolean;
  hideDuplicateTitles?: boolean;
  cleanTitle?: boolean;
  removeSiteNameFromTitle?: boolean;
  whitelist?: Array<{ keyword: string; applyTo: Array<"title" | "description" | "link" | "image_url"> }>;
  blacklist?: Array<{ keyword: string; applyTo: Array<"title" | "description" | "link" | "image_url"> }>;
  autoHideOlderThan?: { enabled: boolean; unit: "days" | "hours"; value: number };
  advancedRules?: Array<
    | { kind: "title_contains_replace"; match: string; replaceWith: string }
    | { kind: "description_contains_replace"; match: string; replaceWith: string }
    | { kind: "link_contains_hide"; match: string }
    | { kind: "domain_block"; domain: string }
  >;
};

export type RssChannelItem = {
  title: string;
  link: string;
  guid: string;
  descriptionHtml: string;
  imageUrl: string;
  enclosureUrl: string;
  publishedRaw: string;
};

export type RssFeedRow = {
  id: string;
  slug: string;
  export_token: string;
  name: string;
  source_type: RssFeedSourceType;
  source_url: string | null;
  manual_urls: string | null;
  status: RssFeedStatus;
  crawl_frequency: RssCrawlFrequency;
  posts_per_feed: number;
  include_images: boolean;
  include_media_enclosure: boolean;
  use_fallback_image: boolean;
  limit_title_length: boolean;
  title_max_chars: number;
  enable_html_description: boolean;
  include_thumbnail: boolean;
  include_all_images: boolean;
  include_videos: boolean;
  limit_description_length: boolean;
  description_max_chars: number;
  starred: boolean;
  last_crawled_at: string | null;
  next_crawl_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export const defaultFilterConfig = (): RssFilterConfig => ({
  hideNoImage: false,
  hideNoDescription: false,
  hideNoDate: false,
  hideNoSecureLink: false,
  hideDuplicateDescriptions: false,
  hideDuplicateTitles: false,
  cleanTitle: false,
  removeSiteNameFromTitle: false,
  whitelist: [],
  blacklist: [],
  autoHideOlderThan: { enabled: false, unit: "days", value: 7 },
  advancedRules: [],
});
