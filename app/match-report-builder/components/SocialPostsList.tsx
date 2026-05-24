"use client";

import { parseSocialPostText } from "@/app/lib/match-report/parse-social-post";
import { TwitterPostEmbed } from "@/app/match-report-builder/components/TwitterPostEmbed";

type Props = {
  posts: string[];
  className?: string;
};

export function SocialPostsList({ posts, className = "" }: Props) {
  if (posts.length === 0) return null;

  return (
    <ul className={`space-y-6 ${className}`.trim()}>
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
              <p className="text-sm leading-6 text-[color:var(--text-secondary)]">{post}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
