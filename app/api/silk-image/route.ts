import { NextResponse } from "next/server";
import {
  assertHttpsOrHttp,
  hostMatchesAllowlist,
  isBlockedSilkProxyHost,
  parseSilkHostAllowlist,
  silkProxyFetchTimeoutMs,
  silkProxyMaxBytes,
  silkProxyMaxRedirects,
} from "@/app/lib/silk-image-proxy-config";

export const dynamic = "force-dynamic";

const IMAGE_CT_PREFIX = "image/";

function isImageContentType(ct: string | null): boolean {
  if (!ct) return false;
  const base = ct.split(";")[0]?.trim().toLowerCase() ?? "";
  return base.startsWith(IMAGE_CT_PREFIX) || base === "image/svg+xml";
}

function sniffIsImage(buf: Uint8Array): boolean {
  if (buf.length < 12) return false;
  /* PNG */
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  /* JPEG */
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  /* GIF */
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  /* WebP RIFF....WEBP */
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
    return true;
  /* SVG */
  const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, Math.min(256, buf.length)));
  if (/<svg[\s>/]/i.test(head)) return true;
  return false;
}

async function readBodyWithLimit(res: Response, maxBytes: number): Promise<ArrayBuffer> {
  const len = res.headers.get("content-length");
  if (len && Number(len) > maxBytes) {
    throw new Error("Response too large");
  }
  const reader = res.body?.getReader();
  if (!reader) {
    const b = await res.arrayBuffer();
    if (b.byteLength > maxBytes) throw new Error("Response too large");
    return b;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      throw new Error("Response too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out.buffer;
}

async function fetchSilkWithRedirects(
  startUrl: string,
  allowlist: string[],
  maxRedirects: number,
  signal: AbortSignal,
): Promise<{ buffer: ArrayBuffer; contentType: string; finalUrl: string }> {
  let current = startUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      throw new Error("Invalid URL");
    }
    assertHttpsOrHttp(url);
    if (isBlockedSilkProxyHost(url.hostname)) {
      throw new Error("Host not allowed");
    }
    if (!hostMatchesAllowlist(url.hostname, allowlist)) {
      throw new Error("Host not in allowlist");
    }

    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "Racing365SocialSilkProxy/1.0",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc || hop >= maxRedirects) {
        throw new Error("Too many redirects or missing Location");
      }
      current = new URL(loc, current).href;
      continue;
    }

    if (!res.ok) {
      throw new Error(`Upstream ${res.status}`);
    }

    const maxBytes = silkProxyMaxBytes();
    const buffer = await readBodyWithLimit(res, maxBytes);
    const ct = res.headers.get("content-type");
    const u8 = new Uint8Array(buffer);

    if (!isImageContentType(ct) && !sniffIsImage(u8)) {
      throw new Error("Not an image");
    }

    const contentType = ct?.split(";")[0]?.trim() || "application/octet-stream";
    return { buffer, contentType, finalUrl: res.url || current };
  }
  throw new Error("Too many redirects");
}

/**
 * Proxy a remote silk image for use in `RunnerSilks.imageUrl`.
 * Query: `url` = fully encoded upstream URL (https only in production recommended).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw?.trim()) {
    return NextResponse.json({ error: "Missing url query parameter" }, { status: 400 });
  }

  let target: string;
  try {
    target = decodeURIComponent(raw.trim());
  } catch {
    return NextResponse.json({ error: "Invalid url encoding" }, { status: 400 });
  }

  const allowlist = parseSilkHostAllowlist();
  if (allowlist.length === 0) {
    return NextResponse.json(
      {
        error:
          "Silk proxy disabled: set SILK_IMAGE_HOST_ALLOWLIST (comma-separated hostnames, e.g. timeform.com,cdn.example.com)",
      },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), silkProxyFetchTimeoutMs());

  try {
    const { buffer, contentType } = await fetchSilkWithRedirects(
      target,
      allowlist,
      silkProxyMaxRedirects(),
      controller.signal,
    );
    clearTimeout(t);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    clearTimeout(t);
    const msg = e instanceof Error ? e.message : "Fetch failed";
    const status =
      msg.includes("allowlist") || msg.includes("not allowed") || msg.includes("Only http")
        ? 403
        : msg.includes("Too large")
          ? 413
          : msg.includes("abort")
            ? 504
            : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
