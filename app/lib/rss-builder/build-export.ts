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

/**
 * Build RSS 2.0 XML for a channel (items should already be filtered & truncated).
 */
export function buildRss2ChannelXml(opts: {
  channelTitle: string;
  channelLink: string;
  channelDescription: string;
  selfLink: string;
  items: ExportItem[];
  includeMediaEnclosure: boolean;
  includeThumbnailInDescription: boolean;
}): string {
  const itemsXml = opts.items
    .map((it) => {
      const descriptionBody = opts.includeThumbnailInDescription && it.imageUrl?.trim()
        ? `<p><img src="${escapeText(it.imageUrl.trim())}" alt="" /></p>\n${it.descriptionHtml}`
        : it.descriptionHtml;
      const enc =
        opts.includeMediaEnclosure && it.enclosureUrl?.trim()
          ? `<enclosure url="${escapeText(it.enclosureUrl.trim())}" length="0" type="application/octet-stream"/>`
          : "";
      return [
        "<item>",
        `<title>${escapeText(it.title)}</title>`,
        `<link>${escapeText(it.link)}</link>`,
        `<guid isPermaLink="false">${escapeText(it.guid || it.link)}</guid>`,
        `<pubDate>${escapeText(it.pubDate || new Date().toUTCString())}</pubDate>`,
        `<description>${cdata(descriptionBody)}</description>`,
        enc,
        "</item>",
      ].join("");
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "<channel>",
    `<title>${escapeText(opts.channelTitle)}</title>`,
    `<link>${escapeText(opts.channelLink)}</link>`,
    `<description>${escapeText(opts.channelDescription)}</description>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `<atom:link rel="self" type="application/rss+xml" href="${escapeText(opts.selfLink)}"/>`,
    itemsXml,
    "</channel>",
    "</rss>",
  ].join("");
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
