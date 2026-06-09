"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseApiJson } from "@/app/lib/parse-api-json";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title?: string; url: string }>;
};

type AssistantResponse = {
  answer?: string;
  sources?: Array<{ title?: string; url: string }>;
  error?: string;
};

const starterPrompts = [
  "How do I use Plexa for this workflow?",
  "Research this football story using approved sources.",
  "How can this read more like Football365?",
  "Check whether these quotes need source attribution.",
];

type PlexaAssistantProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  defaultOpen?: boolean;
  embedded?: boolean;
};

type PopoutPosition = { x: number; y: number };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function initialPopoutPosition(): PopoutPosition {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  if (window.innerWidth < 768) return { x: 8, y: 8 };
  const width = Math.min(440, window.innerWidth - 24);
  const height = Math.min(680, window.innerHeight - 32);
  return {
    x: Math.max(12, window.innerWidth - width - 20),
    y: Math.max(12, window.innerHeight - height - 20),
  };
}

export function PlexaAssistant({ triggerLabel = "Ask Plexa", triggerClassName, defaultOpen = false, embedded = false }: PlexaAssistantProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [position, setPosition] = useState<PopoutPosition | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about Plexa workflows, research, fact-checking, report style, platform setup or anything you need help with.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/plexa-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await parseApiJson<AssistantResponse>(res);
      if (!res.ok || !data.answer) throw new Error(data.error || "Assistant failed");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer ?? "", sources: data.sources ?? [] },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setBusy(false);
    }
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.top });
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 440;
    const height = panel?.offsetHeight ?? 640;
    const nextX = dragState.originX + event.clientX - dragState.startX;
    const nextY = dragState.originY + event.clientY - dragState.startY;
    setPosition({
      x: clamp(nextX, 8, Math.max(8, window.innerWidth - width - 8)),
      y: clamp(nextY, 8, Math.max(8, window.innerHeight - height - 8)),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const openPopout = () => {
    setPosition(initialPopoutPosition());
    setOpen(true);
  };

  const openBrowserPopout = () => {
    const width = 620;
    const height = 780;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const child = window.open(
      "/ask-plexa/popout",
      "ask-plexa",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
    if (child) child.focus();
  };

  const popout = open ? (
    <div
      ref={panelRef}
      className={
        embedded
          ? "relative flex h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur"
          : "fixed z-[1000] flex h-[min(680px,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[440px] flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur"
      }
      style={{
        borderColor: "rgba(16,185,129,0.35)",
        background: "color-mix(in srgb, var(--surface) 96%, transparent)",
        ...(embedded ? {} : { left: `${position?.x ?? 8}px`, top: `${position?.y ?? 8}px` }),
      }}
      role="dialog"
      aria-modal="false"
      aria-label="Ask Plexa chat popout"
    >
      <div
        className={`flex touch-none select-none items-center justify-between gap-3 border-b px-4 py-3 ${embedded ? "" : "cursor-move"}`}
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(135deg, rgba(5,46,22,0.92), rgba(2,6,23,0.92))",
        }}
        onPointerDown={embedded ? undefined : beginDrag}
        onPointerMove={embedded ? undefined : moveDrag}
        onPointerUp={embedded ? undefined : endDrag}
        onPointerCancel={embedded ? undefined : endDrag}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-400 text-sm font-black text-slate-950">
            AI
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[color:var(--text-primary)]">Ask Plexa</p>
            <p className="truncate text-xs text-emerald-200">Platform Q&A, research, fact-checking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!embedded ? (
            <button
              type="button"
              onClick={openBrowserPopout}
              onPointerDown={(event) => event.stopPropagation()}
              className="rounded-full border px-3 py-1 text-xs font-bold text-[color:var(--text-secondary)]"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
            >
              Pop out
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            onPointerDown={(event) => event.stopPropagation()}
            className="grid size-8 place-items-center rounded-full border text-sm font-black text-[color:var(--text-secondary)]"
            style={{ borderColor: "rgba(255,255,255,0.18)" }}
            aria-label="Close Ask Plexa"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={`max-w-[86%] rounded-3xl border px-3 py-2 text-sm leading-6 shadow-sm ${
              message.role === "user" ? "ml-auto rounded-br-md" : "mr-auto rounded-bl-md"
            }`}
            style={{
              borderColor: message.role === "user" ? "rgba(16,185,129,0.35)" : "var(--border)",
              background: message.role === "user" ? "rgba(16,185,129,0.16)" : "var(--surface-muted)",
              color: "var(--text-secondary)",
            }}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.sources?.length ? (
              <div className="mt-3 border-t pt-2 text-xs" style={{ borderColor: "var(--border)" }}>
                <p className="font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Sources</p>
                <ul className="mt-1 space-y-1">
                  {message.sources.slice(0, 6).map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-emerald-300 underline">
                        {source.title || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
        {busy ? (
          <div className="mr-auto max-w-[80%] rounded-3xl rounded-bl-md border px-3 py-2 text-sm text-emerald-200" style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}>
            Plexa is researching…
          </div>
        ) : null}
        {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      </div>

      {messages.length <= 1 ? (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendMessage(prompt)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)]"
              style={{ borderColor: "var(--border)" }}
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex gap-2 border-t p-3"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Ask Plexa…"
          className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  ) : null;

  if (embedded) return popout;

  return (
    <>
      <button
        type="button"
        onClick={openPopout}
        className={
          triggerClassName ??
          "app-nav-link rounded-full px-3 py-2 text-sm font-semibold transition"
        }
        style={{
          color: "var(--text-secondary)",
        }}
      >
        {triggerLabel}
      </button>
      {popout && typeof document !== "undefined" ? createPortal(popout, document.body) : null}
    </>
  );
}
