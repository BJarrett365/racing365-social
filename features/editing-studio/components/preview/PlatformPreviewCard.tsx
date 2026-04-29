"use client";

import { previewUsesSafeZone } from "@/features/editing-studio/preview/preview-platforms";
import type { ResolvedPreviewCopy, PreviewMedia } from "@/features/editing-studio/preview/resolve-preview-data";
import { ellipsize, truncateHintForPlatform } from "@/features/editing-studio/preview/truncate";
import { PreviewSafeZone } from "@/features/editing-studio/components/preview/PreviewSafeZone";
import { PreviewVideoStill } from "@/features/editing-studio/components/preview/PreviewVideoStill";
import type { PlatformType } from "@/features/editing-studio/types/domain";

type Props = {
  platform: PlatformType;
  copy: ResolvedPreviewCopy;
  media: PreviewMedia;
  brandLabel?: string;
};

function MediaBlock({
  media,
  className = "",
  tall,
}: {
  media: PreviewMedia;
  className?: string;
  tall?: boolean;
}) {
  const aspect = tall ? "aspect-[9/16] w-full" : "aspect-square w-full max-w-full sm:aspect-video";
  if (media.kind === "none") {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed bg-[var(--surface-muted)] text-xs text-[color:var(--text-muted)] ${aspect} ${className}`}
        style={{ borderColor: "var(--border)" }}
      >
        No media for this preview — add an image or video in the Media tab, or set a thumbnail in Settings.
      </div>
    );
  }
  if (media.kind === "image") {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-black ${aspect} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.src} alt="" className="h-full w-full object-cover" />
        {media.logoBadge ? (
          <div className="absolute right-2 top-2 rounded border border-white/40 bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-900 shadow">
            Logo
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${aspect} ${className}`}>
      <PreviewVideoStill src={media.src} coverSec={media.coverSec} className="h-full w-full object-cover" />
      {media.logoBug ? (
        <div className="absolute right-2 top-2 rounded border border-white/40 bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow">
          Logo
        </div>
      ) : null}
    </div>
  );
}

function bodyWithMeta(copy: ResolvedPreviewCopy, platform: string) {
  const max = Math.min(truncateHintForPlatform(platform), 900);
  const block = [copy.body, copy.hashtags].filter(Boolean).join("\n\n");
  return ellipsize(block, max);
}

export function PlatformPreviewCard({ platform, copy, media, brandLabel = "Your brand" }: Props) {
  const safe = previewUsesSafeZone(platform);
  const { text: bodyText, truncated } = bodyWithMeta(copy, platform);
  const { text: ctaShow } = ellipsize(copy.cta, 120);
  const { text: signShow } = ellipsize(copy.signOff, 120);
  const headlineShow = ellipsize(copy.headline, 200).text;

  const linkHost = (() => {
    try {
      const u = copy.linkUrl?.trim();
      if (!u) return "";
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  if (platform === "facebook") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
        <div className="flex gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <div className="h-10 w-10 shrink-0 rounded-full bg-blue-600/20" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{brandLabel}</p>
            <p className="text-[11px] text-zinc-500">Just now · 🌎</p>
          </div>
        </div>
        <p className="px-3 pt-2 text-[15px] leading-snug">{headlineShow}</p>
        <p className="whitespace-pre-wrap px-3 pt-1 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{bodyText}</p>
        {truncated ? <p className="px-3 pt-1 text-[10px] text-amber-700 dark:text-amber-400">Simulated truncation</p> : null}
        <div className="mt-2 px-3">
          <MediaBlock media={media} />
        </div>
        {copy.linkUrl ? (
          <div className="mx-3 mb-3 mt-2 flex overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex min-h-[72px] min-w-[72px] bg-zinc-300 dark:bg-zinc-600" />
            <div className="min-w-0 p-2">
              <p className="truncate text-[11px] uppercase text-zinc-500">{linkHost || "link"}</p>
              <p className="line-clamp-2 text-xs font-medium">{headlineShow}</p>
            </div>
          </div>
        ) : null}
        {ctaShow ? <p className="px-3 pb-1 text-sm font-semibold text-blue-700 dark:text-blue-400">{ctaShow}</p> : null}
        {signShow ? <p className="px-3 pb-3 text-xs text-zinc-600 dark:text-zinc-400">{signShow}</p> : null}
      </div>
    );
  }

  if (platform === "x") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black text-zinc-50">
        <div className="flex gap-3 px-3 pt-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-bold">{brandLabel}</span>{" "}
              <span className="text-zinc-500">@handle · now</span>
            </p>
            <p className="mt-1 text-[15px] leading-snug">{headlineShow}</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-normal text-zinc-200">{bodyText}</p>
            {truncated ? <p className="mt-1 text-[10px] text-amber-400/90">Simulated truncation (~280 chars on X)</p> : null}
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800">
              <MediaBlock media={media} />
            </div>
            {ctaShow ? <p className="mt-2 text-sm font-semibold text-sky-400">{ctaShow}</p> : null}
            {signShow ? <p className="mt-1 text-xs text-zinc-500">{signShow}</p> : null}
          </div>
        </div>
        <div className="mt-3 flex justify-around border-t border-zinc-800 py-2 text-xs text-zinc-500">
          <span>Reply</span>
          <span>Repost</span>
          <span>Like</span>
          <span>Share</span>
        </div>
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black text-zinc-50">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-fuchsia-600 p-[2px]">
            <div className="h-full w-full rounded-full bg-black" />
          </div>
          <span className="text-sm font-semibold">{brandLabel}</span>
        </div>
        <MediaBlock media={media} />
        <div className="space-y-1 px-3 py-2">
          <p className="text-xs text-zinc-400">♡ 💬 ✈️ bookmark</p>
          <p className="text-sm">
            <span className="font-semibold">{brandLabel}</span>{" "}
            <span className="whitespace-pre-wrap text-zinc-200">{bodyText}</span>
          </p>
          {truncated ? <p className="text-[10px] text-amber-400/90">Simulated truncation</p> : null}
          {ctaShow ? <p className="text-sm font-semibold text-sky-300">{ctaShow}</p> : null}
          {signShow ? <p className="text-xs text-zinc-500">{signShow}</p> : null}
        </div>
      </div>
    );
  }

  if (platform === "instagram_story") {
    return (
      <div className="relative mx-auto w-[220px] overflow-hidden rounded-3xl border-4 border-zinc-800 bg-zinc-950 shadow-xl">
        <div className="relative w-full bg-zinc-900">
          <MediaBlock media={media} tall />
          {safe ? <PreviewSafeZone /> : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-8 pt-16">
            <p className="text-center text-sm font-bold text-white drop-shadow">{headlineShow}</p>
            {ctaShow ? <p className="mt-1 text-center text-xs font-semibold text-white/95">{ctaShow}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (platform === "linkedin") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
        <div className="flex gap-2 px-3 py-2">
          <div className="h-12 w-12 shrink-0 rounded-full bg-sky-700/30" />
          <div>
            <p className="text-sm font-semibold">{brandLabel}</p>
            <p className="text-[11px] text-zinc-500">1st · Just now</p>
          </div>
        </div>
        <p className="px-3 text-[15px] leading-snug">{headlineShow}</p>
        <p className="whitespace-pre-wrap px-3 pt-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{bodyText}</p>
        {truncated ? <p className="px-3 pt-1 text-[10px] text-amber-700 dark:text-amber-400">Simulated truncation</p> : null}
        <div className="px-3 pt-2">
          <MediaBlock media={media} />
        </div>
        {ctaShow ? <p className="px-3 py-2 text-sm font-semibold text-sky-700 dark:text-sky-400">{ctaShow}</p> : null}
        {signShow ? <p className="px-3 pb-3 text-xs text-zinc-600">{signShow}</p> : null}
      </div>
    );
  }

  if (platform === "tiktok" || platform === "youtube_shorts") {
    const label = platform === "tiktok" ? "TikTok" : "Shorts";
    return (
      <div className="relative mx-auto w-[200px] overflow-hidden rounded-2xl border-4 border-zinc-800 bg-black shadow-xl">
        <div className="relative w-full">
          <MediaBlock media={media} tall />
          {safe ? <PreviewSafeZone /> : null}
          <div className="pointer-events-none absolute right-1 top-1/3 flex flex-col gap-3 text-[10px] text-white">
            <span>♡</span>
            <span>💬</span>
            <span>↗</span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 pb-6 pt-12">
            <p className="text-[10px] font-bold uppercase text-white/80">{label}</p>
            <p className="text-xs font-semibold text-white">{headlineShow}</p>
            <p className="mt-1 line-clamp-3 text-[11px] text-white/95">{bodyText}</p>
            {ctaShow ? <p className="mt-1 text-[11px] font-bold text-amber-300">{ctaShow}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (platform === "whatsapp") {
    return (
      <div
        className="rounded-xl border border-zinc-700 p-3"
        style={{ background: "linear-gradient(180deg, #075e54 0%, #128c7e 40%, #0b141a 40%)" }}
      >
        <div className="rounded-b-xl rounded-tr-xl bg-[#005c4b] px-2 py-2 text-[13px] leading-snug text-zinc-100 shadow">
          <p className="font-semibold">{headlineShow}</p>
          <p className="mt-1 whitespace-pre-wrap">{bodyText}</p>
          {ctaShow ? <p className="mt-2 font-semibold text-emerald-200">{ctaShow}</p> : null}
          {signShow ? <p className="mt-1 text-xs text-emerald-100/80">{signShow}</p> : null}
          <div className="mt-2 overflow-hidden rounded-lg">
            <MediaBlock media={media} />
          </div>
          <p className="mt-1 text-right text-[10px] text-emerald-200/80">now ✓✓</p>
        </div>
      </div>
    );
  }

  if (platform === "telegram") {
    return (
      <div className="rounded-xl border border-sky-900/40 bg-[#17212b] p-2 text-zinc-100">
        <div className="border-b border-sky-900/50 px-2 py-1 text-center text-xs font-bold text-sky-300">Channel</div>
        <div className="mt-2 rounded-lg bg-[#2b5278]/40 px-3 py-2">
          <p className="text-sm font-bold">{headlineShow}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{bodyText}</p>
          {truncated ? <p className="mt-1 text-[10px] text-amber-300/90">Simulated truncation</p> : null}
          <div className="mt-2 overflow-hidden rounded-md border border-sky-800/50">
            <MediaBlock media={media} />
          </div>
          {copy.linkUrl ? (
            <p className="mt-2 truncate text-xs text-sky-300 underline">{copy.linkUrl}</p>
          ) : null}
          {ctaShow ? <p className="mt-2 text-sm font-semibold text-white">{ctaShow}</p> : null}
          {signShow ? <p className="mt-1 text-xs text-zinc-400">{signShow}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-200">
      <p className="text-zinc-400">Preview for {platform} is not styled yet.</p>
      <p className="mt-2 whitespace-pre-wrap">{bodyText}</p>
    </div>
  );
}
