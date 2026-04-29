import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { ManifestEntry } from "@/app/lib/asset-manifest";
import { assetsManifestPath, outputDir } from "@/app/lib/paths";

function normRel(r: string): string {
  return r.split(path.sep).join("/");
}

async function manifestEntryForRel(rel: string): Promise<ManifestEntry | undefined> {
  try {
    const raw = await fs.readFile(assetsManifestPath(), "utf-8");
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return undefined;
    const n = normRel(rel);
    return (list as ManifestEntry[]).find(
      (e) =>
        normRel(e.video) === n ||
        normRel(e.subtitles) === n ||
        (e.editedVideo && normRel(e.editedVideo) === n),
    );
  } catch {
    return undefined;
  }
}

/** Suggested filename for Save / Download (matches manifest SEO slug). */
function dispositionFilenameForRel(
  rel: string,
  basenameFull: string,
  ext: string,
  entry: ManifestEntry | undefined,
): string {
  if (ext === ".mp4" && entry?.seoDownloadFile?.trim()) {
    const raw = entry.seoDownloadFile.trim();
    const isEdited =
      Boolean(entry?.editedVideo) && normRel(entry!.editedVideo!) === normRel(rel);
    const base = raw.replace(/\.mp4$/i, "");
    const withSuffix = isEdited ? `${base}-edited.mp4` : raw;
    return /\.mp4$/i.test(withSuffix) ? withSuffix : `${withSuffix}.mp4`;
  }
  const base = entry?.seoSlug?.trim();
  if (base) {
    if (ext === ".mp4") {
      const isEdited =
        Boolean(entry?.editedVideo) && normRel(entry!.editedVideo!) === normRel(rel);
      return isEdited ? `${base}-short-edited.mp4` : `${base}-short.mp4`;
    }
    if (ext === ".srt") {
      return `${base}.srt`;
    }
  }
  return basenameFull;
}

/** Serves files under /output only (for previews). Query: rel=images/foo/bar.png&download=1 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get("rel");
  if (!rel || rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const root = outputDir();
  const full = path.resolve(root, rel);
  if (!full.startsWith(root)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buf = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".mp4"
            ? "video/mp4"
            : ext === ".webm"
              ? rel.split(path.sep).join("/").startsWith("audio/")
                ? "audio/webm"
                : "video/webm"
              : ext === ".mp3"
                ? "audio/mpeg"
              : ext === ".m4a"
                ? "audio/mp4"
              : ext === ".wav"
                ? "audio/wav"
              : ext === ".srt"
                ? "text/plain; charset=utf-8"
                : ext === ".json"
                  ? "application/json; charset=utf-8"
                  : "application/octet-stream";

    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": "public, max-age=60",
    };

    const download = searchParams.get("download") === "1";
    if (ext === ".mp4" || ext === ".srt") {
      const entry = await manifestEntryForRel(rel);
      const filename = dispositionFilenameForRel(rel, path.basename(full), ext, entry)
        .replace(/"/g, "");
      const dispType = download ? "attachment" : "inline";
      headers["Content-Disposition"] = `${dispType}; filename="${filename}"`;
    } else if (ext === ".json") {
      const filename = path.basename(full).replace(/"/g, "");
      const dispType = download ? "attachment" : "inline";
      headers["Content-Disposition"] = `${dispType}; filename="${filename}"`;
    }

    return new NextResponse(buf, { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
