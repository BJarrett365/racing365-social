"use client";

import { useMemo, useState } from "react";
import { AiProviderGatewayPanel } from "@/app/components/AiProviderGatewayPanel";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import type { ReleaseCheckResult } from "@/app/lib/dev-gateway/release-check";

type ReleaseCheckResponse = {
  result?: ReleaseCheckResult;
  model?: string;
  error?: string;
};

function checklist(result: ReleaseCheckResult): string {
  return [
    `# Release Check / QA Review`,
    "",
    `Decision: ${result.decision}`,
    `Risk level: ${result.riskLevel}`,
    "",
    `## Release Summary`,
    result.releaseSummary,
    "",
    `## Changed Areas`,
    ...result.changedAreas.map((item) => `- ${item}`),
    "",
    `## Risks`,
    ...result.risks.map((item) => `- ${item}`),
    "",
    `## Smoke Tests`,
    ...result.smokeTests.map((item) => `- ${item}`),
    "",
    `## Regression Tests`,
    ...result.regressionTests.map((item) => `- ${item}`),
    "",
    `## Edge Cases`,
    ...result.edgeCases.map((item) => `- ${item}`),
    "",
    `## Admin Security Checks`,
    ...result.adminChecks.map((item) => `- ${item}`),
    "",
    `## Third-Party Checks`,
    ...result.thirdPartyChecks.map((item) => `- ${item}`),
    "",
    `## Rollback Plan`,
    ...result.rollbackPlan.rollbackSteps.map((item) => `- ${item}`),
    "",
    `## Rollback Affected Systems`,
    ...result.rollbackPlan.affectedSystems.map((item) => `- ${item}`),
    "",
    `## Database Changes`,
    ...result.rollbackPlan.databaseChanges.map((item) => `- ${item}`),
    "",
    `## Environment Changes`,
    ...result.rollbackPlan.environmentChanges.map((item) => `- ${item}`),
    "",
    `## Audit`,
    `Feature branch: ${result.audit.featureBranch || "not supplied"}`,
    ...result.audit.changedFiles.map((item) => `- Changed file: ${item}`),
    ...result.audit.testResults.map((item) => `- Test result: ${item}`),
    ...result.audit.approvalRequired.map((item) => `- Approval required: ${item}`),
  ].join("\n");
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border bg-[color:var(--surface)] p-4" style={{ borderColor: "var(--border)" }}>
      <h3 className="text-sm font-black uppercase tracking-wide text-[color:var(--text-primary)]">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">No items returned.</p>
      )}
    </section>
  );
}

export function DevGatewayClient() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReleaseCheckResult | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qaChecklist = useMemo(() => (result ? checklist(result) : ""), [result]);

  const runCheck = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(studioApiPath("/api/dev-gateway/release-check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json().catch(() => ({}))) as ReleaseCheckResponse;
      if (!res.ok || !data.result) throw new Error(data.error || "Release check failed");
      setResult(data.result);
      setModel(data.model ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release check failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setStatus(`${label} copied.`);
  };

  const save = async (type: "release_note" | "qa_finding") => {
    if (!result) return;
    setSaving(type);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/dev-gateway/release-check/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: result.releaseSummary.slice(0, 90) || "Release Check / QA Review",
          input,
          result,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus(type === "release_note" ? "Saved as release note." : "Saved as QA finding.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-[var(--shadow-card)]" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">Plexa Dev Gateway</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">Release Check / QA Review</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
              Paste a release summary, git diff, changed files list, Cursor plan or deployment notes. OpenAI will advise on risks and test steps, but never approves merge or production deployment automatically.
            </p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide text-[color:var(--primary)]" style={{ borderColor: "var(--border)", background: "var(--accent-soft)" }}>
            Advisory only
          </span>
        </div>
      </section>

      <section className="rounded-2xl border bg-[color:var(--surface-muted)] p-5" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[color:var(--text-primary)]">Release material</h2>
          <R365Button onClick={() => void runCheck()} disabled={busy || !input.trim()}>
            {busy ? "Reviewing…" : "Run Release Check"}
          </R365Button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={14}
          placeholder="Paste release summary, git diff, changed files, Cursor plan, deployment notes..."
          className="mt-4 w-full rounded-2xl border p-4 text-sm leading-6 outline-none"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
        />
        {error ? <p className="mt-3 text-sm font-semibold text-[color:var(--danger)]">{error}</p> : null}
        {status ? <p className="mt-3 text-sm font-semibold text-emerald-300">{status}</p> : null}
      </section>

      {result ? (
        <section className="space-y-4">
          <div className="rounded-2xl border bg-[color:var(--surface)] p-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide text-[color:var(--text-primary)]" style={{ borderColor: "var(--border)" }}>
                    {result.decision}
                  </span>
                  <span className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide text-[color:var(--text-secondary)]" style={{ borderColor: "var(--border)" }}>
                    Risk: {result.riskLevel}
                  </span>
                  {model ? <span className="text-xs font-semibold text-[color:var(--text-muted)]">{model}</span> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">{result.releaseSummary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <R365Button variant="ghost" onClick={() => void copy(qaChecklist, "QA checklist")}>Copy QA Checklist</R365Button>
                <R365Button variant="ghost" onClick={() => void copy(result.cursorFixPrompt, "Cursor fix prompt")}>Copy Cursor Fix Prompt</R365Button>
                <R365Button onClick={() => void save("release_note")} disabled={saving !== null}>{saving === "release_note" ? "Saving…" : "Save as Release Note"}</R365Button>
                <R365Button onClick={() => void save("qa_finding")} disabled={saving !== null}>{saving === "qa_finding" ? "Saving…" : "Save as QA Finding"}</R365Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ResultList title="Changed Areas" items={result.changedAreas} />
            <ResultList title="Risks" items={result.risks} />
            <ResultList title="Smoke Tests" items={result.smokeTests} />
            <ResultList title="Regression Tests" items={result.regressionTests} />
            <ResultList title="Edge Cases" items={result.edgeCases} />
            <ResultList title="Admin Checks" items={result.adminChecks} />
            <ResultList title="Third-Party Checks" items={result.thirdPartyChecks} />
            <ResultList title="Rollback Steps" items={result.rollbackPlan.rollbackSteps} />
            <ResultList title="Rollback Affected Systems" items={result.rollbackPlan.affectedSystems} />
            <ResultList title="Database Changes" items={result.rollbackPlan.databaseChanges} />
            <ResultList title="Environment Changes" items={result.rollbackPlan.environmentChanges} />
            <ResultList title="Audit Changed Files" items={result.audit.changedFiles} />
            <ResultList title="Audit Test Results" items={result.audit.testResults} />
          </div>

          <section className="rounded-2xl border bg-[color:var(--surface)] p-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-black uppercase tracking-wide text-[color:var(--text-primary)]">Cursor Fix Prompt</h3>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[color:var(--surface-muted)] p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
              {result.cursorFixPrompt || "No fix prompt returned."}
            </pre>
          </section>
        </section>
      ) : null}

      <AiProviderGatewayPanel />
    </div>
  );
}
