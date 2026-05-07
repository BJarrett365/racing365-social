"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";

type Props = {
  busy: boolean;
  error: string | null;
  onFetchParse: (url: string) => Promise<void>;
  onBack: () => void;
  /** Override default racecard-only help text (Next off / Fast results import). */
  description?: string;
};

export function RacecardUrlImportForm({ busy, error, onFetchParse, onBack, description }: Props) {
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-xs font-medium text-[color:var(--text-secondary)] underline-offset-2 hover:underline"
        onClick={onBack}
        disabled={busy}
      >
        ← Back
      </button>
      <p className="text-sm text-[color:var(--text-secondary)]">
        {description ?? (
          <>
            Paste a racecard link (for example Racing365 display URLs with a <span className="font-mono">raceId</span>{" "}
            query). Planet Sport Studio fetches meeting data from the public race API and maps runners, silks, and top picks when
            available.
          </>
        )}
      </p>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        URL
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          disabled={busy}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        />
      </label>
      {error ? <p className="text-xs font-medium text-[color:var(--danger)]">{error}</p> : null}
      <R365Button
        type="button"
        onClick={() => void onFetchParse(url)}
        disabled={busy || !url.trim()}
      >
        {busy ? "Fetching…" : "Fetch + Parse"}
      </R365Button>
    </div>
  );
}
