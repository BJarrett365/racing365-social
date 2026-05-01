import { getServerSecretAsync } from "@/app/lib/server-secrets";
import type { YouTubeVideoMeta } from "@/app/lib/youtube-script/types";
import { canonicalYouTubeUrl } from "@/app/lib/youtube-script/utils";

function parseIsoDurationSeconds(duration: string): number | undefined {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeVideoMeta> {
  const url = canonicalYouTubeUrl(videoId);
  const apiKey = await getServerSecretAsync("YOUTUBE_API_KEY");

  if (apiKey) {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
    endpoint.searchParams.set("part", "snippet,contentDetails");
    endpoint.searchParams.set("id", videoId);
    endpoint.searchParams.set("key", apiKey);
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = (await res.json()) as {
        items?: Array<{
          snippet?: {
            title?: string;
            channelTitle?: string;
            publishedAt?: string;
            thumbnails?: Record<string, { url?: string }>;
          };
          contentDetails?: { duration?: string };
        }>;
      };
      const item = data.items?.[0];
      if (item?.snippet?.title) {
        return {
          videoId,
          url,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails?.maxres?.url ??
            item.snippet.thumbnails?.high?.url ??
            item.snippet.thumbnails?.medium?.url,
          durationSeconds: item.contentDetails?.duration ? parseIsoDurationSeconds(item.contentDetails.duration) : undefined,
          publishedAt: item.snippet.publishedAt,
        };
      }
    }
  }

  const oembed = new URL("https://www.youtube.com/oembed");
  oembed.searchParams.set("url", url);
  oembed.searchParams.set("format", "json");
  const res = await fetch(oembed);
  if (!res.ok) {
    throw new Error("Unable to fetch YouTube metadata. Check the URL or configure a YouTube API key.");
  }
  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };
  return {
    videoId,
    url,
    title: data.title ?? "Untitled YouTube video",
    channelName: data.author_name,
    thumbnailUrl: data.thumbnail_url,
  };
}
