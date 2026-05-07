"use client";

import { useEffect, useMemo, useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import type { LanguageCode, LanguageCronFrequency, LanguageSourceParserType } from "@/app/lib/language-studio/types";

type ClientRow = {
  id: string;
  name: string;
  active: boolean;
};

type SourceBrandRow = {
  id: string;
  name: string;
  feedUrl: string;
  sourceLanguage: LanguageCode;
  parserType: LanguageSourceParserType;
  active: boolean;
};

type CronJob = {
  id: string;
  name: string;
  active: boolean;
  clientIds: string[];
  sourceBrand: string;
  sourceLanguage: LanguageCode;
  sourceUrl: string;
  parserType: LanguageSourceParserType;
  frequency: LanguageCronFrequency;
  intervalMinutes?: number;
  hour?: number;
  minute?: number;
  weekdays?: number[];
  timezone: string;
  processImages: boolean;
  importFullArticles: boolean;
  notifyOnFailure: boolean;
  notificationEmail?: string;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastRunStatus?: "success" | "failed" | "skipped" | "running";
  lastRunMessage?: string;
  consecutiveFailures: number;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
};

type CronRun = {
  id: string;
  jobId: string;
  jobName: string;
  trigger: "scheduled" | "manual";
  status: "success" | "failed" | "skipped";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  createdCount: number;
  updatedCount: number;
  articleCount: number;
  imageCount: number;
  message?: string;
  error?: string;
  createdAt: string;
};

type CronsResponse = {
  jobs?: CronJob[];
  runs?: CronRun[];
  clients?: ClientRow[];
  sourceBrands?: SourceBrandRow[];
  error?: string;
};

const inputClass = "mt-1 w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-3 py-2 text-sm text-white placeholder:text-slate-600";
const checkboxClass = "flex items-center gap-2 text-sm text-slate-300";
const weekdays = [
  ["0", "Sun"],
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
] as const;

function emptyDraft(source?: SourceBrandRow, client?: ClientRow): Partial<CronJob> {
  return {
    name: source ? `${source.name} import` : "Sportinglife import",
    active: true,
    clientIds: client ? [client.id] : [],
    sourceBrand: source?.name ?? "Sportinglife",
    sourceLanguage: source?.sourceLanguage ?? "en",
    sourceUrl: source?.feedUrl ?? "",
    parserType: source?.parserType ?? "rss-default",
    frequency: "hourly",
    intervalMinutes: 60,
    hour: 9,
    minute: 0,
    weekdays: [1],
    timezone: "Europe/London",
    processImages: true,
    importFullArticles: true,
    notifyOnFailure: true,
    notificationEmail: "",
  };
}

function formatDate(value?: string): string {
  if (!value) return "Not run yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status?: CronJob["lastRunStatus"] | CronRun["status"]): string {
  if (status === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "failed") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "running") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-slate-700 bg-slate-900/40 text-slate-300";
}

function draftFromJob(job: CronJob, overrides: Partial<CronJob> = {}): Partial<CronJob> {
  return {
    ...job,
    ...overrides,
  };
}

async function readApiJson<T>(res: Response, fallback: string): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return (await res.json()) as T;
  const text = await res.text();
  const title = text.match(/<title>(.*?)<\/title>/i)?.[1];
  throw new Error(title ? `${fallback}: ${title}` : `${fallback}: server returned ${res.status} ${res.statusText || "non-JSON response"}`);
}

export function CronsPanel() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [sourceBrands, setSourceBrands] = useState<SourceBrandRow[]>([]);
  const [draft, setDraft] = useState<Partial<CronJob>>(emptyDraft());
  const [adminToken, setAdminToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeClients = useMemo(() => clients.filter((client) => client.active), [clients]);
  const activeSources = useMemo(() => sourceBrands.filter((source) => source.active), [sourceBrands]);

  const load = async () => {
    const res = await fetch("/api/language/crons");
    const data = await readApiJson<CronsResponse>(res, "Could not load crons");
    if (!res.ok) throw new Error(data.error || "Could not load crons.");
    setJobs(data.jobs ?? []);
    setRuns(data.runs ?? []);
    setClients(data.clients ?? []);
    setSourceBrands(data.sourceBrands ?? []);
    if (!draft.sourceUrl && data.sourceBrands?.[0]) {
      setDraft(emptyDraft(data.sourceBrands[0], data.clients?.find((client) => client.active)));
    }
  };

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load crons.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cron action failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    const res = await fetch("/api/language/crons", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
      body: JSON.stringify({ ...draft, adminToken }),
    });
    const data = await readApiJson<{ error?: string; job?: CronJob }>(res, "Cron save failed");
    if (!res.ok) throw new Error(data.error || "Cron save failed.");
    if (!data.job) throw new Error("Cron save did not return a job.");
    setDraft(data.job);
    setMessage(draft.id ? "Cron updated." : "Cron created. Use New cron or Duplicate to add another one.");
  });

  const runNow = (id: string) => run(async () => {
    const res = await fetch("/api/language/crons", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
      body: JSON.stringify({ action: "run-now", id, adminToken }),
    });
    const data = await readApiJson<{ error?: string; run?: CronRun }>(res, "Cron run failed");
    if (!res.ok) throw new Error(data.error || "Cron run failed.");
    setMessage(data.run?.status === "failed" ? `Run failed: ${data.run.error}` : "Cron run completed.");
  });

  const deleteJob = (id: string) => run(async () => {
    const job = jobs.find((row) => row.id === id);
    const ok = window.confirm(`Delete ${job?.name ?? "this cron"}? This removes the job and its run history.`);
    if (!ok) return;
    const suffix = adminToken ? `&adminToken=${encodeURIComponent(adminToken)}` : "";
    const res = await fetch(`/api/language/crons?id=${encodeURIComponent(id)}${suffix}`, {
      method: "DELETE",
      headers: adminToken ? { "x-admin-token": adminToken } : undefined,
    });
    const data = await readApiJson<{ error?: string }>(res, "Cron delete failed");
    if (!res.ok) throw new Error(data.error || "Cron delete failed.");
    setDraft(emptyDraft(activeSources[0], activeClients[0]));
    setMessage("Cron deleted.");
  });

  const toggleJobActive = (job: CronJob) => run(async () => {
    const res = await fetch("/api/language/crons", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminToken ? { "x-admin-token": adminToken } : {}) },
      body: JSON.stringify({ ...job, active: !job.active, adminToken }),
    });
    const data = await readApiJson<{ error?: string; job?: CronJob }>(res, "Cron update failed");
    if (!res.ok) throw new Error(data.error || "Cron update failed.");
    setMessage(data.job?.active ? "Cron resumed." : "Cron paused.");
  });

  const duplicateJob = (job: CronJob) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = job;
    void _id;
    void _createdAt;
    void _updatedAt;
    setDraft({
      ...copy,
      name: `${job.name} copy`,
      lastRunAt: undefined,
      lastSuccessAt: undefined,
      lastFailureAt: undefined,
      lastRunStatus: undefined,
      lastRunMessage: undefined,
      consecutiveFailures: 0,
      nextRunAt: undefined,
    });
    setMessage("Cron duplicated in the form. Change anything needed, then Create cron.");
  };

  const toggleClient = (clientId: string, checked: boolean) => {
    setDraft((row) => ({
      ...row,
      clientIds: checked
        ? [...new Set([...(row.clientIds ?? []), clientId])]
        : (row.clientIds ?? []).filter((id) => id !== clientId),
    }));
  };

  const selectSource = (name: string) => {
    const source = sourceBrands.find((row) => row.name === name);
    setDraft((row) => ({
      ...row,
      sourceBrand: name,
      sourceLanguage: source?.sourceLanguage ?? row.sourceLanguage ?? "en",
      sourceUrl: source?.feedUrl ?? row.sourceUrl ?? "",
      parserType: source?.parserType ?? row.parserType ?? "rss-default",
    }));
  };

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <section className="rounded-2xl border border-[#1f2d26] bg-[#0a0e0c] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Create / edit content cron</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Schedule XML, RSS, URL or API imports for selected clients. The scheduler checks due jobs regularly; each job only runs when its saved time is due.
            </p>
          </div>
          <R365Button type="button" variant="ghost" onClick={() => setDraft(emptyDraft(activeSources[0], activeClients[0]))}>New cron</R365Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Cron name
            <input className={inputClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Source brand
            <select className={inputClass} value={draft.sourceBrand ?? ""} onChange={(e) => selectSource(e.target.value)}>
              {activeSources.map((source) => <option key={source.id} value={source.name}>{source.name}</option>)}
              {draft.sourceBrand && !activeSources.some((source) => source.name === draft.sourceBrand) ? <option value={draft.sourceBrand}>{draft.sourceBrand}</option> : null}
              <option value="Sportinglife">Sportinglife</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Import type
            <select className={inputClass} value={draft.parserType ?? "rss-default"} onChange={(e) => setDraft({ ...draft, parserType: e.target.value as LanguageSourceParserType })}>
              <option value="rss-default">RSS / XML default</option>
              <option value="wordpress-rss">WordPress RSS</option>
              <option value="json-api">JSON API</option>
              <option value="html-page">URL / HTML page</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500 lg:col-span-2">
            Source XML / RSS / URL / API
            <input className={inputClass} value={draft.sourceUrl ?? ""} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} placeholder="https://www.sportinglife.com/..." />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Admin token
            <input className={inputClass} type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="When ADMIN_TOKEN is set" />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-[#1f2d26] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Clients</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {activeClients.map((client) => (
              <label key={client.id} className="flex items-center gap-2 rounded-lg border border-[#1f2d26] bg-black/20 px-3 py-2 text-sm text-slate-300">
                <input type="checkbox" checked={(draft.clientIds ?? []).includes(client.id)} onChange={(e) => toggleClient(client.id, e.target.checked)} />
                {client.name}
              </label>
            ))}
          </div>
          {activeClients.length === 0 ? <p className="mt-2 text-sm text-slate-500">Add clients in Language Studio Client Access first.</p> : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-5">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Frequency
            <select className={inputClass} value={draft.frequency ?? "hourly"} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as LanguageCronFrequency })}>
              <option value="minutes">Every X minutes</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly / weekdays</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Interval minutes
            <input className={inputClass} type="number" min={5} value={draft.intervalMinutes ?? 60} onChange={(e) => setDraft({ ...draft, intervalMinutes: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Hour
            <input className={inputClass} type="number" min={0} max={23} value={draft.hour ?? 9} onChange={(e) => setDraft({ ...draft, hour: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Minute
            <input className={inputClass} type="number" min={0} max={59} value={draft.minute ?? 0} onChange={(e) => setDraft({ ...draft, minute: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Timezone
            <input className={inputClass} value={draft.timezone ?? "Europe/London"} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {weekdays.map(([value, label]) => (
            <label key={value} className={checkboxClass}>
              <input
                type="checkbox"
                checked={(draft.weekdays ?? [1]).includes(Number(value))}
                onChange={(e) => setDraft({
                  ...draft,
                  weekdays: e.target.checked
                    ? [...new Set([...(draft.weekdays ?? []), Number(value)])]
                    : (draft.weekdays ?? []).filter((day) => day !== Number(value)),
                })}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <label className={checkboxClass}><input type="checkbox" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />Active</label>
          <label className={checkboxClass}><input type="checkbox" checked={draft.processImages ?? true} onChange={(e) => setDraft({ ...draft, processImages: e.target.checked })} />Process images</label>
          <label className={checkboxClass}><input type="checkbox" checked={draft.importFullArticles ?? true} onChange={(e) => setDraft({ ...draft, importFullArticles: e.target.checked })} />Import full articles</label>
          <label className={checkboxClass}><input type="checkbox" checked={draft.notifyOnFailure ?? true} onChange={(e) => setDraft({ ...draft, notifyOnFailure: e.target.checked })} />Notify on failure</label>
        </div>
        <label className="mt-4 block text-xs font-semibold uppercase text-slate-500">
          Failure notification email
          <input className={inputClass} type="email" value={draft.notificationEmail ?? ""} onChange={(e) => setDraft({ ...draft, notificationEmail: e.target.value })} placeholder="alerts@example.com" />
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Requires <code>RESEND_API_KEY</code> and <code>CRON_ALERT_FROM_EMAIL</code> or <code>RESEND_FROM_EMAIL</code> in the server environment.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <R365Button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving..." : draft.id ? "Save changes" : "Create cron"}</R365Button>
          {draft.id ? <R365Button type="button" variant="ghost" onClick={() => void runNow(draft.id as string)} disabled={busy}>Run now</R365Button> : null}
          {draft.id ? <R365Button type="button" variant="ghost" onClick={() => void deleteJob(draft.id as string)} disabled={busy}>Delete</R365Button> : null}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-[#1f2d26] bg-[#0a0e0c] p-5">
          <h2 className="text-xl font-black text-white">Cron jobs</h2>
          <div className="mt-4 space-y-3">
            {jobs.length === 0 ? <p className="text-sm text-slate-500">No crons yet. Fill in the form above and press Create cron.</p> : jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-[#1f2d26] bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{job.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{job.sourceBrand} · {job.frequency} · next {formatDate(job.nextRunAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.lastRunMessage ?? "Waiting for first run."}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(job.lastRunStatus)}`}>{job.active ? job.lastRunStatus ?? "ready" : "paused"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#22c55e]/50" onClick={() => setDraft(draftFromJob(job))}>
                    Edit
                  </button>
                  <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#22c55e]/50" onClick={() => void runNow(job.id)} disabled={busy}>
                    Run now
                  </button>
                  <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#22c55e]/50" onClick={() => void toggleJobActive(job)} disabled={busy}>
                    {job.active ? "Pause" : "Resume"}
                  </button>
                  <button type="button" className="rounded-lg border border-[#1f2d26] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#22c55e]/50" onClick={() => duplicateJob(job)}>
                    Duplicate
                  </button>
                  <button type="button" className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10" onClick={() => void deleteJob(job.id)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1f2d26] bg-[#0a0e0c] p-5">
          <h2 className="text-xl font-black text-white">Recent runs</h2>
          <div className="mt-4 space-y-3">
            {runs.length === 0 ? <p className="text-sm text-slate-500">No runs yet.</p> : runs.slice(0, 12).map((runRow) => (
              <div key={runRow.id} className="rounded-xl border border-[#1f2d26] bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{runRow.jobName}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(runRow.finishedAt)} · {runRow.trigger}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(runRow.status)}`}>{runRow.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{runRow.error ?? runRow.message ?? `${runRow.articleCount} article(s) checked.`}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
