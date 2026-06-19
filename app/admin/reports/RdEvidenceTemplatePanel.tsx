"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import {
  RD_EVIDENCE_TEMPLATES,
  getRdEvidenceTemplate,
  type RdEvidenceTemplate,
} from "@/app/lib/dev-gateway/rd-evidence-templates";

function titleWithDate(prefix: string): string {
  return `${prefix} · ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
}

export function RdEvidenceTemplatePanel() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<RdEvidenceTemplate["id"]>("security-incident");
  const template = useMemo(() => getRdEvidenceTemplate(templateId), [templateId]);
  const [title, setTitle] = useState(() => titleWithDate(getRdEvidenceTemplate("security-incident").defaultTitle));
  const [content, setContent] = useState(() => getRdEvidenceTemplate("security-incident").content);
  const [linkedFiles, setLinkedFiles] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = useCallback((id: string) => {
    const next = getRdEvidenceTemplate(id);
    setTemplateId(next.id);
    setTitle(titleWithDate(next.defaultTitle));
    setContent(next.content);
    setLinkedFiles("");
    setStatus(null);
    setError(null);
  }, []);

  const save = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Add content before saving.");
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const files = linkedFiles
        .split(/[\n,]/)
        .map((f) => f.trim())
        .filter(Boolean);
      const res = await fetch("/api/dev-gateway/rd-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim() || titleWithDate(template.defaultTitle),
          content: trimmed,
          mode: template.mode,
          linkedFiles: files,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save R&D evidence.");
      setStatus("Saved to Gateway R&D evidence.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Gateway R&D evidence template">
      <p className="mb-4 text-sm text-slate-300">
        Structured prompts for the R&D evidence file.{" "}
        <strong className="font-semibold text-amber-300">Log every security incident and material vulnerability</strong>{" "}
        — failures and remediation are part of the technical record.{" "}
        <strong className="font-semibold text-slate-200">Never paste secrets, API keys or live credentials.</strong>
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="rd-template" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Template
          </label>
          <select
            id="rd-template"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
          >
            {RD_EVIDENCE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{template.description}</p>
        </div>

        <div>
          <label htmlFor="rd-title" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Title
          </label>
          <input
            id="rd-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label htmlFor="rd-content" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Evidence (edit before saving)
          </label>
          <textarea
            id="rd-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            className="mt-1 w-full rounded-md border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 font-mono text-xs leading-5 text-slate-200"
          />
        </div>

        <div>
          <label htmlFor="rd-files" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Linked files (optional, comma or newline separated)
          </label>
          <input
            id="rd-files"
            type="text"
            value={linkedFiles}
            onChange={(e) => setLinkedFiles(e.target.value)}
            placeholder="app/lib/match-report/fact-check.ts, commits/abc123"
            className="mt-1 w-full rounded-md border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <R365Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save to R&D evidence"}
          </R365Button>
          <button
            type="button"
            onClick={() => applyTemplate(templateId)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Reset template
          </button>
        </div>

        {status ? <p className="text-sm text-[#22c55e]">{status}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </Panel>
  );
}
