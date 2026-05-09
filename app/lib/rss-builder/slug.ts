import { createHash, randomBytes } from "crypto";

export function randomSlugPart(): string {
  return randomBytes(6).toString("base64url").replace(/=/g, "").slice(0, 10);
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "feed";
}

export function makeFeedSlug(name: string): string {
  return `${slugifyName(name)}-${randomSlugPart()}`;
}

export function makeBundleSlug(name: string): string {
  return `bundle-${slugifyName(name)}-${randomSlugPart()}`;
}

export function itemKeyFromLinkAndGuid(link: string, guid: string): string {
  const g = guid.trim();
  if (g) return `g:${g.slice(0, 400)}`;
  return `h:${createHash("sha256").update(link.trim()).digest("hex")}`;
}
