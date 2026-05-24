import { Suspense } from "react";
import "@/app/match-report-builder/match-report-builder-theme.css";
import { MatchReportBuilderClient } from "@/app/match-report-builder/MatchReportBuilderClient";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Match Report Builder · ${BRAND_SUITE}`,
  description:
    "Editorial-first match report workflow — define brand voice, import SixLogics core data, and build structured event intelligence.",
};

export default function MatchReportBuilderPage() {
  return (
    <div className="space-y-8">
      <section className="mrb-hero relative overflow-hidden rounded-3xl border px-6 py-10 md:px-10">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--primary)]">Match Report Builder</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[color:var(--text-primary)] md:text-5xl">
            Original match reports from structured intelligence.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)] md:text-base">
            Start with <strong className="font-semibold text-[color:var(--text-primary)]">who the content is for</strong>, then import
            SixLogics core data into a governed Event Intelligence Object — never raw feed JSON to AI.
          </p>
        </div>
      </section>
      <Suspense fallback={<p className="text-sm text-[color:var(--text-muted)]">Loading…</p>}>
        <MatchReportBuilderClient />
      </Suspense>
    </div>
  );
}
