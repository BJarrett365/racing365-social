"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { withAppPathPrefix } from "@/app/lib/app-base-path";

export function LibraryUploadImagePanel() {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [libraryRel, setLibraryRel] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setMessage(null);
      setImageUrl(null);
      setLibraryRel(null);

      const form = e.currentTarget;
      const input = form.elements.namedItem("file") as HTMLInputElement;
      const file = input?.files?.[0];
      if (!file || file.size === 0) {
        setError("Choose an image file first.");
        return;
      }

      setBusy(true);
      try {
        const body = new FormData();
        body.set("file", file);
        const note = title.trim();
        if (note) body.set("title", note);

        const res = await fetch("/api/library/upload-image", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          imageUrl?: string;
          imageLibraryRel?: string;
        };
        if (!res.ok || !data.ok || !data.imageUrl || !data.imageLibraryRel) {
          throw new Error(data.error || "Upload failed.");
        }
        setImageUrl(data.imageUrl);
        setLibraryRel(data.imageLibraryRel);
        setMessage("Saved to the shared asset library. Use the path in editors or browse it under Library → Library images.");
        form.reset();
        setTitle("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setBusy(false);
      }
    },
    [title],
  );

  const displaySrc = libraryRel
    ? withAppPathPrefix(`/api/file?rel=${encodeURIComponent(libraryRel)}`)
    : imageUrl;

  return (
    <Panel title="Upload image to asset library" className="mb-6">
      <p className="text-xs text-[color:var(--text-secondary)]">
        JPEG, PNG, WebP, or GIF (max ~12MB). Files are stored under{" "}
        <code className="text-[color:var(--text-muted)]">images/library/tools-upload/</code> and appear in{" "}
        <Link href="/library?tab=libraryImages" className="font-semibold text-[#86efac] underline hover:text-[#bbf7d0]">
          Library → Library images
        </Link>
        .
      </p>
      <form onSubmit={(ev) => void onSubmit(ev)} className="mt-4 space-y-3">
        <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          Optional label / keywords note
          <input
            type="text"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            placeholder="e.g. Cheltenham hero, branded still…"
            className="ui-input mt-1 w-full max-w-xl px-3 py-2 text-sm placeholder:text-[color:var(--text-muted)]"
          />
        </label>
        <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          Image file
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            required
            className="mt-1 block w-full max-w-xl text-sm text-[color:var(--text-secondary)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--surface-muted)] file:px-3 file:py-2 file:font-semibold file:text-[color:var(--text-primary)]"
          />
        </label>
        <R365Button type="submit" disabled={busy}>
          {busy ? "Uploading…" : "Upload to library"}
        </R365Button>
      </form>
      {message ? <p className="mt-3 text-xs text-[#22c55e]">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {displaySrc ? (
        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
          {libraryRel ? (
            <p className="break-all font-mono text-[11px] text-[color:var(--text-secondary)]">
              Library: <code>{libraryRel}</code>
            </p>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displaySrc} alt="" className="mt-2 max-h-80 max-w-full rounded-lg border border-[color:var(--border)] object-contain" />
          <div className="mt-2 flex flex-wrap gap-2">
            <R365Button
              type="button"
              variant="ghost"
              onClick={() => void navigator.clipboard.writeText(displaySrc)}
            >
              Copy image URL
            </R365Button>
            {libraryRel ? (
              <R365Button type="button" variant="ghost" onClick={() => void navigator.clipboard.writeText(libraryRel)}>
                Copy library path
              </R365Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
