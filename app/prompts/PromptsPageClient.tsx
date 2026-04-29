"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import Link from "next/link";

type BuiltinRow = {
  id: string;
  title: string;
  category: string;
  source: string;
  body: string;
  catalogBody: string;
  overriddenAt?: string;
};

type CustomRow = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export function PromptsPageClient() {
  const [builtin, setBuiltin] = useState<BuiltinRow[]>([]);
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editingBuiltinId, setEditingBuiltinId] = useState<string | null>(null);
  const [editBuiltinBody, setEditBuiltinBody] = useState("");
  const [builtinSavingId, setBuiltinSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/prompts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load prompts.");
      setBuiltin(data.builtin ?? []);
      setCustom(data.custom ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), body: newBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setNewTitle("");
      setNewBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this prompt?")) return;
    setError(null);
    if (editingId === id) {
      setEditingId(null);
    }
    try {
      const res = await fetch(`/api/prompts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function startEdit(p: CustomRow) {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditBody(p.body);
    setOpenId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title: editTitle.trim(),
          body: editBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setUpdating(false);
    }
  }

  function toggleOpen(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  function startEditBuiltin(p: BuiltinRow) {
    setEditingBuiltinId(p.id);
    setEditBuiltinBody(p.body);
    setOpenId(p.id);
  }

  function cancelEditBuiltin() {
    setEditingBuiltinId(null);
  }

  async function onSaveBuiltin(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBuiltinId) return;
    setBuiltinSavingId(editingBuiltinId);
    setError(null);
    try {
      const res = await fetch("/api/prompts/builtin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingBuiltinId, body: editBuiltinBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setEditingBuiltinId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBuiltinSavingId(null);
    }
  }

  async function onRevertBuiltin(id: string) {
    if (!confirm("Remove your override and restore the built-in default from the codebase?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/prompts/builtin?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revert failed.");
      if (editingBuiltinId === id) setEditingBuiltinId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revert failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Prompts</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Built-in prompts used by the editor and API routes. Edits are saved under{" "}
          <code className="text-slate-500">data/local/builtin-prompt-overrides.json</code> (gitignored). Custom
          snippets live in <code className="text-slate-500">data/local/user-prompts.json</code>. Per-brand AI guidelines
          live on{" "}
          <Link href="/brand-guidelines" className="font-semibold text-[#22c55e] hover:underline">
            Brand Guidelines
          </Link>
          .
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      <Panel title="Add new prompt">
        <form onSubmit={onAdd} className="space-y-3">
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. My racecard sign-off variant"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Prompt body
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 font-mono text-xs text-slate-200"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Paste or write the full prompt text…"
            />
          </label>
          <R365Button type="submit" disabled={saving || !newTitle.trim()}>
            {saving ? "Saving…" : "Save prompt"}
          </R365Button>
        </form>
      </Panel>

      <Panel title="Your prompts">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : custom.length === 0 ? (
          <p className="text-sm text-slate-500">No custom prompts yet — add one above.</p>
        ) : (
          <ul className="space-y-2">
            {custom.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3"
              >
                {editingId === p.id ? (
                  <form onSubmit={onUpdate} className="space-y-3">
                    <label className="block text-xs font-semibold uppercase text-slate-500">
                      Title
                      <input
                        className="mt-1 w-full rounded-lg border border-[#1f2d26] bg-black/30 px-3 py-2 text-sm text-white"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase text-slate-500">
                      Prompt body
                      <textarea
                        className="mt-1 min-h-[160px] w-full rounded-lg border border-[#1f2d26] bg-black/30 px-3 py-2 font-mono text-xs text-slate-200"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                    </label>
                    <p className="font-mono text-[10px] text-slate-600">{p.id}</p>
                    <div className="flex flex-wrap gap-2">
                      <R365Button type="submit" disabled={updating || !editTitle.trim()}>
                        {updating ? "Updating…" : "Update"}
                      </R365Button>
                      <R365Button type="button" variant="ghost" onClick={cancelEdit} disabled={updating}>
                        Cancel
                      </R365Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleOpen(`c-${p.id}`)}
                        className="text-left text-sm font-semibold text-[#eab308] hover:underline"
                      >
                        {p.title}
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <R365Button type="button" variant="ghost" onClick={() => startEdit(p)}>
                          Edit
                        </R365Button>
                        <R365Button type="button" variant="danger" onClick={() => void onDelete(p.id)}>
                          Delete
                        </R365Button>
                      </div>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-slate-600">{p.id}</p>
                    {p.updatedAt !== p.createdAt && (
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        Updated {new Date(p.updatedAt).toLocaleString()}
                      </p>
                    )}
                    {openId === `c-${p.id}` && (
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-[#1f2d26] bg-black/40 p-2 text-xs text-slate-300">
                        {p.body || "(empty)"}
                      </pre>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Built-in prompts (editable)">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {builtin.map((p) => (
              <li key={p.id} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleOpen(p.id)}
                    className="flex flex-1 flex-wrap items-baseline justify-between gap-2 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-200">{p.title}</span>
                    <span className="rounded bg-[#1f2d26] px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400">
                      {p.category}
                    </span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <R365Button type="button" variant="ghost" onClick={() => startEditBuiltin(p)}>
                      Edit
                    </R365Button>
                    {p.overriddenAt ? (
                      <R365Button type="button" variant="ghost" onClick={() => void onRevertBuiltin(p.id)}>
                        Revert to default
                      </R365Button>
                    ) : null}
                  </div>
                </div>
                {p.overriddenAt ? (
                  <p className="mt-1 text-[10px] text-amber-200/80">
                    Override saved {new Date(p.overriddenAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-slate-600">{p.source}</p>
                {openId === p.id && editingBuiltinId !== p.id && (
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-[#1f2d26] bg-black/40 p-2 text-xs text-slate-300">
                    {p.body}
                  </pre>
                )}
                {editingBuiltinId === p.id ? (
                  <form onSubmit={onSaveBuiltin} className="mt-2 space-y-3">
                    <label className="block text-xs font-semibold uppercase text-slate-500">
                      Prompt body
                      <textarea
                        className="mt-1 min-h-[200px] w-full rounded-lg border border-[#1f2d26] bg-black/30 px-3 py-2 font-mono text-xs text-slate-200"
                        value={editBuiltinBody}
                        onChange={(e) => setEditBuiltinBody(e.target.value)}
                        spellCheck={false}
                      />
                    </label>
                    <p className="font-mono text-[10px] text-slate-600">{p.id}</p>
                    <div className="flex flex-wrap gap-2">
                      <R365Button type="submit" disabled={Boolean(builtinSavingId)}>
                        {builtinSavingId === p.id ? "Saving…" : "Save"}
                      </R365Button>
                      <R365Button
                        type="button"
                        variant="ghost"
                        onClick={cancelEditBuiltin}
                        disabled={Boolean(builtinSavingId)}
                      >
                        Cancel
                      </R365Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
