"use client";

import { Suspense } from "react";
import { Panel } from "@/app/components/Panel";
import { LiveSessionsList } from "@/features/live-control/components/LiveSessionsList";
import { MuxLiveControlPanel } from "@/features/live-control/components/MuxLiveControlPanel";
import { RestreamIntegrationPanel } from "@/features/live-control/components/RestreamIntegrationPanel";

function RestreamFallback() {
  return (
    <div className="rounded-xl border p-6 text-sm text-[color:var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
      Loading Restream…
    </div>
  );
}

/** Live Control home — sessions (core) + provider accounts (Mux / Restream). */
export function LiveControlDashboard() {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Live Control</p>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Sessions</h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Create live sessions, manage Mux and Restream providers. Independent from Editing Studio — future
          hooks for projects and approved stories are stored on each session.
        </p>
      </div>

      <Panel title="Your live sessions">
        <LiveSessionsList />
      </Panel>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Provider accounts</h2>
        <p className="text-sm text-[color:var(--text-muted)]">
          Connect credentials once; use them when you start a session from the list above.
        </p>
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-[color:var(--text-secondary)]">Mux</h3>
            <MuxLiveControlPanel />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-medium text-[color:var(--text-secondary)]">Restream</h3>
            <Suspense fallback={<RestreamFallback />}>
              <RestreamIntegrationPanel />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
