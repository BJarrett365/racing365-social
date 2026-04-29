"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseApiJson } from "@/app/lib/parse-api-json";
import type { RewriteIntent } from "@/features/editing-studio/services/editing-ai-actions";
import type { EditingProject, PlatformType } from "@/features/editing-studio/types/domain";
import {
  AI_TARGET_FIELDS,
  type AiTargetField,
  aiTargetLabel,
  appendVariantFromTarget,
  defaultAiSourceText,
  getFieldString,
  insertBelowBlock,
  mergeHashtags,
  setFieldString,
} from "@/features/editing-studio/components/ai-actions-field-helpers";

const btnClass =
  "rounded-md border px-2 py-1.5 text-left text-xs font-medium text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-45 disabled:hover:bg-transparent";
const btnStyle = { borderColor: "var(--border)" } as const;
const sectionLabel = "mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]";

type SuggestionState =
  | { kind: "idle" }
  | { kind: "loading"; label: string }
  | { kind: "error"; message: string; retry: () => void }
  | { kind: "text"; text: string; actionLabel: string }
  | {
      kind: "list";
      variant: "headlines" | "captions" | "hashtags" | "key_points";
      items: string[];
      actionLabel: string;
    };

type Props = {
  draft: EditingProject;
  setDraft: React.Dispatch<React.SetStateAction<EditingProject>>;
  previewPlatform: PlatformType;
};

function Spinner() {
  return (
    <div
      className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
      style={{ borderColor: "var(--r365-gold)", borderTopColor: "transparent" }}
      aria-hidden
    />
  );
}

export function AiActionsPanel({ draft, setDraft, previewPlatform }: Props) {
  const [targetField, setTargetField] = useState<AiTargetField>("socialCaption");
  const [customSource, setCustomSource] = useState("");
  const [suggestion, setSuggestion] = useState<SuggestionState>({ kind: "idle" });
  const [editedText, setEditedText] = useState("");
  const [listSelected, setListSelected] = useState(0);

  const useCustomSource = customSource.trim().length > 0;
  const sourceText = useMemo(() => {
    if (useCustomSource) return customSource.trim();
    return defaultAiSourceText(draft);
  }, [customSource, draft]);

  const contextPayload = useMemo(
    () => ({
      brand: draft.brand,
      title: draft.title,
      summary: draft.summary,
    }),
    [draft.brand, draft.title, draft.summary],
  );

  useEffect(() => {
    if (suggestion.kind === "text") {
      setEditedText(suggestion.text);
    } else if (suggestion.kind === "list" && suggestion.items.length > 0) {
      setListSelected(0);
      setEditedText(suggestion.items[0] ?? "");
    }
  }, [suggestion]);

  useEffect(() => {
    if (suggestion.kind === "list" && suggestion.items[listSelected] !== undefined) {
      setEditedText(suggestion.items[listSelected] ?? "");
    }
  }, [listSelected, suggestion]);

  const dismiss = useCallback(() => {
    setSuggestion({ kind: "idle" });
  }, []);

  const applyTextToField = useCallback(
    (text: string, mode: "replace" | "insert") => {
      setDraft((p) => {
        const cur = getFieldString(p, targetField);
        let next: string;
        if (targetField === "hashtags" && mode === "insert") {
          const tags = text.split(/\s+/).filter(Boolean);
          next = mergeHashtags(cur, tags);
        } else if (targetField === "hashtags") {
          next = text;
        } else if (mode === "insert") {
          next = insertBelowBlock(cur, text);
        } else {
          next = text;
        }
        return setFieldString(p, targetField, next);
      });
      dismiss();
    },
    [dismiss, setDraft, targetField],
  );

  const saveAsVariant = useCallback(
    (text: string) => {
      setDraft((p) => appendVariantFromTarget(p, text.trim(), previewPlatform, targetField));
      dismiss();
    },
    [dismiss, previewPlatform, setDraft, targetField],
  );

  const runFetch = useCallback(
    async (label: string, exec: () => Promise<void>) => {
      setSuggestion({ kind: "loading", label });
      try {
        await exec();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Request failed";
        setSuggestion({
          kind: "error",
          message,
          retry: () => void runFetch(label, exec),
        });
      }
    },
    [],
  );

  const postRewrite = (intent: RewriteIntent, actionLabel: string) => {
    void runFetch(actionLabel, async () => {
      const res = await fetch("/api/editing/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          sourceText,
          ...contextPayload,
        }),
      });
      const data = await parseApiJson<{ text?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Rewrite failed");
      if (!data.text?.trim()) throw new Error("Empty response");
      setSuggestion({ kind: "text", text: data.text.trim(), actionLabel });
    });
  };

  const postHeadlines = (mode: "headlines" | "captions", actionLabel: string) => {
    void runFetch(actionLabel, async () => {
      const res = await fetch("/api/editing/ai/headlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sourceText,
          count: 3,
          ...contextPayload,
        }),
      });
      const data = await parseApiJson<{ options?: string[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const opts = data.options?.filter((x) => typeof x === "string" && x.trim()) ?? [];
      if (opts.length === 0) throw new Error("No options returned");
      setSuggestion({
        kind: "list",
        variant: mode === "headlines" ? "headlines" : "captions",
        items: opts,
        actionLabel,
      });
    });
  };

  const postHashtags = () => {
    void runFetch("Hashtags", async () => {
      const res = await fetch("/api/editing/ai/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          ...contextPayload,
        }),
      });
      const data = await parseApiJson<{ hashtags?: string[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const tags = data.hashtags?.filter((x) => typeof x === "string" && x.trim()) ?? [];
      if (tags.length === 0) throw new Error("No hashtags returned");
      setSuggestion({ kind: "list", variant: "hashtags", items: tags, actionLabel: "Hashtag set" });
    });
  };

  const postPinned = () => {
    void runFetch("Pinned comment", async () => {
      const res = await fetch("/api/editing/ai/pinned-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          ...contextPayload,
        }),
      });
      const data = await parseApiJson<{ text?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (!data.text?.trim()) throw new Error("Empty response");
      setSuggestion({ kind: "text", text: data.text.trim(), actionLabel: "Pinned comment" });
    });
  };

  const postSummarise = () => {
    void runFetch("Key points", async () => {
      const res = await fetch("/api/editing/ai/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          mode: "key_points",
          ...contextPayload,
        }),
      });
      const data = await parseApiJson<{ points?: string[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const pts = data.points?.filter((x) => typeof x === "string" && x.trim()) ?? [];
      if (pts.length === 0) throw new Error("No key points returned");
      setSuggestion({ kind: "list", variant: "key_points", items: pts, actionLabel: "Key points" });
    });
  };

  const busy = suggestion.kind === "loading";

  const applyListSelection = (mode: "replace" | "insert") => {
    if (suggestion.kind !== "list") return;
    const raw =
      suggestion.variant === "hashtags"
        ? suggestion.items.join(" ")
        : suggestion.variant === "key_points"
          ? suggestion.items.map((p) => `• ${p.trim()}`).join("\n")
          : editedText.trim();
    if (!raw) return;
    if (suggestion.variant === "key_points") {
      applyTextToField(raw, mode);
      return;
    }
    if (suggestion.variant === "hashtags") {
      if (mode === "replace") {
        applyTextToField(suggestion.items.join(" "), "replace");
      } else {
        applyTextToField(suggestion.items.join(" "), "insert");
      }
      return;
    }
    applyTextToField(editedText.trim(), mode);
  };

  return (
    <div className="space-y-3" aria-label="AI writing tools">
      <div>
        <label className={sectionLabel} htmlFor="ai-target-field">
          Apply to field
        </label>
        <select
          id="ai-target-field"
          className="mt-1 w-full rounded-lg border bg-[var(--surface)] px-2 py-1.5 text-xs text-[color:var(--text-primary)]"
          style={{ borderColor: "var(--border)" }}
          value={targetField}
          onChange={(e) => setTargetField(e.target.value as AiTargetField)}
          disabled={busy}
        >
          {AI_TARGET_FIELDS.map((f) => (
            <option key={f} value={f}>
              {aiTargetLabel(f)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={sectionLabel} htmlFor="ai-custom-source">
          Optional source override
        </label>
        <textarea
          id="ai-custom-source"
          className="mt-1 max-h-28 min-h-[52px] w-full resize-y rounded-lg border bg-[var(--surface)] px-2 py-1.5 text-xs text-[color:var(--text-primary)]"
          style={{ borderColor: "var(--border)" }}
          placeholder={useCustomSource ? "" : `Using: ${sourceText.slice(0, 120)}${sourceText.length > 120 ? "…" : ""}`}
          value={customSource}
          onChange={(e) => setCustomSource(e.target.value)}
          disabled={busy}
          spellCheck={false}
        />
        <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
          Leave empty to use social caption → headline → summary → notes.
        </p>
      </div>

      {suggestion.kind === "loading" ? (
        <div className="flex items-center gap-2 rounded-lg border px-2 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
          <Spinner />
          <span className="text-[color:var(--text-secondary)]">{suggestion.label}…</span>
        </div>
      ) : null}

      {suggestion.kind === "error" ? (
        <div
          className="space-y-2 rounded-lg border border-red-500/40 bg-red-500/5 px-2 py-2 text-xs text-red-800 dark:text-red-200"
          role="alert"
        >
          <p>{suggestion.message}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnClass} style={btnStyle} onClick={() => suggestion.retry()}>
              Retry
            </button>
            <button type="button" className={btnClass} style={btnStyle} onClick={dismiss}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {suggestion.kind === "text" || suggestion.kind === "list" ? (
        <div
          className="space-y-2 rounded-lg border p-2"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
          role="region"
          aria-label="AI suggestion"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Suggestion · {suggestion.actionLabel}
            </span>
            <button type="button" className="text-[10px] font-medium text-[color:var(--accent)] hover:underline" onClick={dismiss}>
              Dismiss
            </button>
          </div>

          {suggestion.kind === "text" ? (
            <textarea
              className="max-h-48 min-h-[80px] w-full resize-y rounded border bg-[var(--surface)] px-2 py-1.5 text-xs text-[color:var(--text-primary)]"
              style={{ borderColor: "var(--border)" }}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              spellCheck
            />
          ) : null}

          {suggestion.kind === "list" && suggestion.variant !== "key_points" ? (
            <div className="space-y-2">
              {suggestion.variant === "hashtags" ? (
                <ul className="flex flex-wrap gap-1 text-xs text-[color:var(--text-primary)]">
                  {suggestion.items.map((t, i) => (
                    <li key={i} className="rounded border px-1.5 py-0.5" style={{ borderColor: "var(--border)" }}>
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    {suggestion.items.map((item, i) => (
                      <label key={i} className="flex cursor-pointer items-start gap-2 text-xs">
                        <input
                          type="radio"
                          name="ai-list-pick"
                          checked={listSelected === i}
                          onChange={() => setListSelected(i)}
                          className="mt-0.5"
                        />
                        <span className="text-[color:var(--text-primary)]">{item}</span>
                      </label>
                    ))}
                  </div>
                  <textarea
                    className="max-h-36 min-h-[64px] w-full resize-y rounded border bg-[var(--surface)] px-2 py-1.5 text-xs text-[color:var(--text-primary)]"
                    style={{ borderColor: "var(--border)" }}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    spellCheck
                  />
                </>
              )}
            </div>
          ) : null}

          {suggestion.kind === "list" && suggestion.variant === "key_points" ? (
            <ul className="list-inside list-disc space-y-1 text-xs text-[color:var(--text-primary)]">
              {suggestion.items.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              className="rounded-md border border-transparent bg-[color:var(--accent)] px-2 py-1.5 text-xs font-semibold text-[color:var(--accent-foreground)] disabled:opacity-50"
              onClick={() => {
                if (suggestion.kind === "text") {
                  applyTextToField(editedText, "replace");
                } else if (suggestion.kind === "list") {
                  applyListSelection("replace");
                }
              }}
            >
              Replace field
            </button>
            <button
              type="button"
              disabled={busy}
              className={btnClass}
              style={btnStyle}
              onClick={() => {
                if (suggestion.kind === "text") {
                  applyTextToField(editedText, "insert");
                } else if (suggestion.kind === "list") {
                  applyListSelection("insert");
                }
              }}
            >
              Insert below
            </button>
            <button
              type="button"
              disabled={busy}
              className={btnClass}
              style={btnStyle}
              onClick={() => {
                const text =
                  suggestion.kind === "text"
                    ? editedText.trim()
                    : suggestion.kind === "list" && suggestion.variant === "key_points"
                      ? suggestion.items.map((p) => `• ${p.trim()}`).join("\n")
                      : suggestion.kind === "list" && suggestion.variant === "hashtags"
                        ? suggestion.items.join(" ")
                        : editedText.trim();
                if (!text) return;
                saveAsVariant(text);
              }}
            >
              Save as variant
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <p className={sectionLabel}>Platform rewrites</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("rewrite_x", "Rewrite for X")}>
            Rewrite for X
          </button>
          <button
            type="button"
            disabled={busy}
            className={btnClass}
            style={btnStyle}
            onClick={() => postRewrite("rewrite_facebook", "Rewrite for Facebook")}
          >
            Rewrite for Facebook
          </button>
          <button
            type="button"
            disabled={busy}
            className={btnClass}
            style={btnStyle}
            onClick={() => postRewrite("rewrite_linkedin", "Rewrite for LinkedIn")}
          >
            Rewrite for LinkedIn
          </button>
          <button
            type="button"
            disabled={busy}
            className={btnClass}
            style={btnStyle}
            onClick={() => postRewrite("rewrite_instagram", "Rewrite for Instagram")}
          >
            Rewrite for Instagram
          </button>
        </div>
      </div>

      <div>
        <p className={sectionLabel}>Tone & length</p>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("shorten", "Shorten")}>
            Shorten
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("expand", "Expand")}>
            Expand
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("punchier", "Punchier")}>
            Punchier
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("neutral", "More neutral")}>
            More neutral
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("urgent", "More urgent")}>
            More urgent
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postRewrite("add_cta", "Add CTA")}>
            Add CTA
          </button>
          <button
            type="button"
            disabled={busy}
            className={btnClass}
            style={btnStyle}
            onClick={() => postRewrite("push_notification", "Push notification")}
          >
            Push notification
          </button>
        </div>
      </div>

      <div>
        <p className={sectionLabel}>Options & extras</p>
        <div className="grid grid-cols-1 gap-1">
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postHeadlines("headlines", "3 headlines")}>
            3 headline options
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={() => postHeadlines("captions", "3 captions")}>
            3 caption options
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={postHashtags}>
            Hashtag set
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={postSummarise}>
            Key points
          </button>
          <button type="button" disabled={busy} className={btnClass} style={btnStyle} onClick={postPinned}>
            Pinned comment
          </button>
        </div>
      </div>
    </div>
  );
}
