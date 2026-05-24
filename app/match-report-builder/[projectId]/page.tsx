import { Suspense } from "react";
import "@/app/match-report-builder/match-report-builder-theme.css";
import { MatchReportBuilderClient } from "@/app/match-report-builder/MatchReportBuilderClient";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Match Report Builder · ${BRAND_SUITE}`,
  description: "Resume a saved match report workflow at the current step.",
};

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function MatchReportProjectPage({ params }: Props) {
  const { projectId } = await params;
  return (
    <div className="space-y-8">
      <section className="mrb-hero relative overflow-hidden rounded-3xl border px-6 py-8 md:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--primary)]">Match Report Builder</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--text-primary)]">Resume report</h1>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Project {projectId}</p>
      </section>
      <Suspense fallback={<p className="text-sm text-[color:var(--text-muted)]">Loading…</p>}>
        <MatchReportBuilderClient initialProjectId={projectId} />
      </Suspense>
    </div>
  );
}
