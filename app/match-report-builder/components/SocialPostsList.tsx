"use client";

import { isProbablyDirectVideoStreamUrl, type LoopFeedMediaItem } from "@/app/lib/data-studio/loop-feed";
import { parseSocialPostText } from "@/app/lib/match-report/parse-social-post";
import { TwitterPostEmbed } from "@/app/match-report-builder/components/TwitterPostEmbed";

export type SocialPostEmbedSource = {
  id: string;
  sideLabel: string;
  text: string;
  postUrl: string;
  author?: string;
  handle?: string;
  time?: string;
  media?: LoopFeedMediaItem[];
};

type Props = {
  posts: string[];
  embedSources?: SocialPostEmbedSource[];
  className?: string;
};

function sourceTitle(source: SocialPostEmbedSource): string {
  const handle = source.handle?.replace(/^@/, "");
  return [source.author, handle ? `@${handle}` : "", source.sideLabel].filter(Boolean).join(" · ") || source.sideLabel;
}

function GenericSocialPostCard({ source }: { source: SocialPostEmbedSource }) {
  const directVideos = (source.media ?? []).filter((media) => isProbablyDirectVideoStreamUrl(media.url));
  const platformVideos = (source.media ?? []).filter(
    (media) => media.kind === "video" && !isProbablyDirectVideoStreamUrl(media.url),
  );

  return (
    <article
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">{sourceTitle(source)}</p>
          {source.time ? <p className="text-xs text-[color:var(--text-muted)]">{source.time}</p> : null}
        </div>
        {source.text ? <p className="text-sm leading-6 text-[color:var(--text-secondary)]">{source.text}</p> : null}
        {directVideos.map((media) => (
          <video
            key={media.url}
            controls
            preload="metadata"
            playsInline
            className="aspect-video w-full rounded-lg"
            src={media.url}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {platformVideos.map((media) => (
            <a
              key={media.url}
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-[color:var(--surface-hover)]"
              style={{ borderColor: "var(--border)" }}
            >
              Watch clip
            </a>
          ))}
          <a
            href={source.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-[color:var(--surface-hover)]"
            style={{ borderColor: "var(--border)" }}
          >
            Open original post
          </a>
        </div>
      </div>
    </article>
  );
}

function SocialPostEmbed({ source }: { source: SocialPostEmbedSource }) {
  const parsed = parseSocialPostText(`${source.text} ${source.postUrl}`);
  if (parsed.tweetUrls.length > 0) {
    return (
      <article className="space-y-3">
        {parsed.caption ? (
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">{parsed.caption}</p>
        ) : null}
        {parsed.tweetUrls.map((url) => (
          <TwitterPostEmbed key={url} url={url} />
        ))}
      </article>
    );
  }

  return <GenericSocialPostCard source={source} />;
}

export function SocialPostsList({ posts, embedSources = [], className = "" }: Props) {
  if (posts.length === 0 && embedSources.length === 0) return null;

  return (
    <ul className={`space-y-6 ${className}`.trim()}>
      {embedSources.map((source) => (
        <li key={source.id}>
          <SocialPostEmbed source={source} />
        </li>
      ))}
      {posts.map((post, index) => {
        const parsed = parseSocialPostText(post);
        const key = parsed.tweetUrls[0] ?? `${index}-${parsed.caption.slice(0, 24)}`;

        return (
          <li key={key} className="space-y-3">
            {parsed.caption ? (
              <p className="text-sm leading-6 text-[color:var(--text-secondary)]">{parsed.caption}</p>
            ) : null}

            {parsed.tweetUrls.length > 0 ? (
              parsed.tweetUrls.map((url) => <TwitterPostEmbed key={url} url={url} />)
            ) : (
              <p className="text-sm leading-6 text-[color:var(--text-muted)]">{post}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
