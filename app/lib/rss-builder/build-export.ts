export type ExportItem = {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  descriptionHtml: string;
  imageUrl?: string | null;
  enclosureUrl?: string | null;
};

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]>")}]]>`;
}

function looksLikeVideoUrl(url: string): boolean {
  return /\.(mp4|webm|m3u8|mov)(\?|#|$)/i.test(url);
}

function looksLikeImageUrl(url: string): boolean {
  if (!url.trim() || looksLikeVideoUrl(url)) return false;
  return (
    /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(url) ||
    /\/images\/news\/|\/_next\/image\?|imgix|cloudinary|\/image\//i.test(url)
  );
}

function guessMimeFromImageUrl(url: string): string {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".avif")) return "image/avif";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}

function guessVideoMime(url: string): string {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mov")) return "video/quicktime";
  if (path.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  return "video/mp4";
}

function guessEnclosureMime(url: string): string {
  if (looksLikeVideoUrl(url)) return guessVideoMime(url);
  if (looksLikeImageUrl(url)) return guessMimeFromImageUrl(url);
  return "application/octet-stream";
}

/** rss.app-style: one hero image for description + enclosure + media:content. */
function pickHeroImageUrl(it: ExportItem): string {
  const img = it.imageUrl?.trim() ?? "";
  if (img && looksLikeImageUrl(img)) return img;
  const enc = it.enclosureUrl?.trim() ?? "";
  if (enc && looksLikeImageUrl(enc)) return enc;
  return "";
}

/**
 * Build RSS 2.0 XML for a channel (items should already be filtered & truncated).
 * When `includeImages` and `includeMediaEnclosure` are set, mirrors hero `image_url` into
 * `<enclosure>` and `<media:content>` like common aggregators (e.g. rss.app).
 */
export function buildRss2ChannelXml(opts: {
  channelTitle: string;
  channelLink: string;
  channelDescription: string;
  selfLink: string;
  /** `atom:link rel="self"` type attribute (default RSS media type). */
  selfLinkType?: string;
  items: ExportItem[];
  /** When false, omit lead images, enclosures, and MRSS derived from stored image_url. */
  includeImages: boolean;
  includeMediaEnclosure: boolean;
  includeThumbnailInDescription: boolean;
}): string {
  const itemsXml = opts.items
    .map((it) => {
      const hero = opts.includeImages ? pickHeroImageUrl(it) : "";
      const descriptionBody =
        opts.includeImages && opts.includeThumbnailInDescription && hero
          ? `<p><img src="${escapeText(hero)}" alt="" style="width: 100%;" /></p>\n${it.descriptionHtml}`
          : it.descriptionHtml;

      const rawEnc = it.enclosureUrl?.trim() ?? "";
      const rawImg = opts.includeImages ? it.imageUrl?.trim() ?? "" : "";
      const mediaUrl = opts.includeMediaEnclosure && (rawEnc || rawImg) ? rawEnc || rawImg : "";
      const emitEnclosure = Boolean(mediaUrl);
      const mime = emitEnclosure ? guessEnclosureMime(mediaUrl) : "";
      const emitMrssImage =
        emitEnclosure && looksLikeImageUrl(mediaUrl) && !looksLikeVideoUrl(mediaUrl);

      const enc = emitEnclosure
        ? `<enclosure url="${escapeText(mediaUrl)}" length="0" type="${escapeText(mime)}"/>`
        : "";
      const mrss = emitMrssImage
        ? `<media:content medium="image" url="${escapeText(mediaUrl)}" type="${escapeText(mime)}"/>`
        : "";

      const lines = [
        "<item>",
        `<title>${escapeText(it.title)}</title>`,
        `<link>${escapeText(it.link)}</link>`,
        `<guid isPermaLink="false">${escapeText(it.guid || it.link)}</guid>`,
        `<pubDate>${escapeText(it.pubDate || new Date().toUTCString())}</pubDate>`,
        `<description>${cdata(descriptionBody)}</description>`,
      ];
      if (enc) lines.push(enc);
      if (mrss) lines.push(mrss);
      lines.push("</item>");
      return lines.join("\n");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">`,
    "<channel>",
    `<title>${escapeText(opts.channelTitle)}</title>`,
    `<link>${escapeText(opts.channelLink)}</link>`,
    `<description>${escapeText(opts.channelDescription)}</description>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `<atom:link rel="self" type="${escapeText(opts.selfLinkType ?? "application/rss+xml")}" href="${escapeText(opts.selfLink)}"/>`,
    itemsXml,
    "</channel>",
    "</rss>",
  ].join("\n");
}

export function buildFeedJsonExport(opts: {
  channelTitle: string;
  channelLink: string;
  items: ExportItem[];
}): string {
  return JSON.stringify(
    {
      title: opts.channelTitle,
      link: opts.channelLink,
      updated: new Date().toISOString(),
      items: opts.items.map((it) => ({
        title: it.title,
        link: it.link,
        guid: it.guid || it.link,
        pubDate: it.pubDate,
        descriptionHtml: it.descriptionHtml,
        imageUrl: it.imageUrl ?? null,
        enclosureUrl: it.enclosureUrl ?? null,
      })),
    },
    null,
    2,
  );
}
