import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `R&D Reports · Admin · ${BRAND_SUITE}`,
};

const reports = [
  {
    title: "Planet Sport Studio R&D Assessment",
    href: "/admin/reports/rd-assessment",
    description:
      "Strategic assessment covering positioning, rights/source advantage, UKRI fit, R&D priorities and the product roadmap for Planet Sport Studio.",
  },
  {
    title: "Planet Sport Studio R&D Report",
    href: "/admin/reports/rd-report",
    description:
      "Technical R&D narrative covering LoopFeed, CrowdyNews, CrowdyAI, tools/API collaboration, technological uncertainties, evidence to collect and R&D tax framing.",
  },
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Platform</p>
        <h1 className="mt-1 text-3xl font-black text-white">R&D reports</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Internal product and technical R&D material for Planet Sport Studio. These reports should be kept in sync as
          Article Studio, Language Studio, LoopFeed, CrowdyNews, CrowdyAI and AI production workflows evolve.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <Panel key={report.href} title={report.title}>
            <p className="text-sm text-slate-300">{report.description}</p>
            <Link
              href={report.href}
              className="mt-4 inline-flex rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black hover:opacity-95"
            >
              Open report →
            </Link>
          </Panel>
        ))}
      </div>

      <Panel title="R&D evidence reminder">
        <p className="text-sm text-slate-300">
          R&D is not only about successful outcomes. Keep evidence of failed prototypes, blocked approaches, parsing
          errors, model/prompt experiments, rejected workflows, API limitations, latency issues, rights/provenance
          trade-offs and manual barriers that the platform is trying to remove.
        </p>
      </Panel>

      <Link href="/admin" className="inline-flex text-sm font-semibold text-[#22c55e] hover:underline">
        Back to Admin →
      </Link>
    </div>
  );
}
