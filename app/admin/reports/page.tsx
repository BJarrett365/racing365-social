import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";
import { readDevGatewayStore } from "@/app/lib/dev-gateway/store";
import { RdEvidenceTemplatePanel } from "./RdEvidenceTemplatePanel";

export const metadata = {
  title: `R&D Reports · Admin · ${BRAND_SUITE}`,
};

type ReportCard = {
  title: string;
  href: string;
  description: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

type RdDocument = {
  title: string;
  href: string;
  downloadHref: string;
  description: string;
};

const reports: ReportCard[] = [
  {
    title: "Full R&D Technical Report",
    href: "/api/docs/plexa-studio-rd-report",
    description:
      "Complete source document for Launch Accounting and R&D advisers: uncertainties, outcomes, Match Intelligence, Sport365 templates, UK R&D tax context and document registry.",
    primaryLabel: "View markdown →",
    secondaryHref: "/api/docs/plexa-studio-rd-report?download=1",
    secondaryLabel: "Download .md",
  },
  {
    title: "Planet Sport Studio R&D Assessment",
    href: "/admin/reports/rd-assessment",
    description:
      "Strategic assessment covering positioning, rights/source advantage, UKRI fit, R&D priorities and the product roadmap for Planet Sport Studio.",
    primaryLabel: "Open report →",
  },
  {
    title: "Planet Sport Studio R&D Report",
    href: "/admin/reports/rd-report",
    description:
      "Interactive technical narrative covering LoopFeed, CrowdyNews, CrowdyAI, tools/API collaboration, technological uncertainties, evidence to collect and R&D tax framing.",
    primaryLabel: "Open report →",
  },
];

const matchIntelligenceDocs: RdDocument[] = [
  {
    title: "R&D master index",
    href: "/api/docs/rd-index",
    downloadHref: "/api/docs/rd-index?download=1",
    description: "Registry of all R&D documents, admin routes, API downloads and evidence discipline.",
  },
  {
    title: "Match Report Builder V1 — R&D Plan",
    href: "/api/docs/match-report-builder-rd",
    downloadHref: "/api/docs/match-report-builder-rd?download=1",
    description: "Wizard flow, MIO, fact check, article score, source hierarchy and publish pipeline.",
  },
  {
    title: "Match Intelligence Engine — master plan",
    href: "/api/docs/match-intelligence-engine",
    downloadHref: "/api/docs/match-intelligence-engine?download=1",
    description: "MIO architecture, Report 2.0 sections, significance engine, one engine for previews and reports.",
  },
  {
    title: "Match Preview V1 — product spec",
    href: "/api/docs/match-preview-v1-spec",
    downloadHref: "/api/docs/match-preview-v1-spec?download=1",
    description: "contentType match_preview, schedule, MIO assembly, preview workflow branches.",
  },
  {
    title: "Match Preview — editorial & SEO benchmark",
    href: "/api/docs/match-preview-rd-report",
    downloadHref: "/api/docs/match-preview-rd-report?download=1",
    description: "F365 competitive benchmark (7.4/10), gaps vs 9.5+ Plexa target, section mapping.",
  },
  {
    title: "Football365 Editorial Calibration",
    href: "/api/docs/football365-editorial-calibration",
    downloadHref: "/api/docs/football365-editorial-calibration?download=1",
    description: "Authoritative ChatGPT decisions: editorial quality > commercial, significance engine rules.",
  },
  {
    title: "Football365 Preview 10/10 Scoring Engine",
    href: "/api/docs/football365-preview-scoring-engine",
    downloadHref: "/api/docs/football365-preview-scoring-engine?download=1",
    description: "Weighted preview dimensions, publish gates, fabrication vs editorial score layers.",
  },
];

function DocumentCard({ doc }: { doc: RdDocument }) {
  return (
    <article className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-4">
      <p className="text-sm font-bold text-white">{doc.title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{doc.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={doc.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-md border border-[#1f2d26] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#111816]"
        >
          View →
        </a>
        <a
          href={doc.downloadHref}
          className="inline-flex rounded-md bg-[#1f2937] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
        >
          Download .md
        </a>
      </div>
    </article>
  );
}

export default async function AdminReportsPage() {
  const store = await readDevGatewayStore();
  const rdEvidence = store.rdEvidence.slice(0, 12);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Platform</p>
        <h1 className="mt-1 text-3xl font-black text-white">R&D reports</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Internal product and technical R&D material for Planet Sport Studio. Start with the{" "}
          <strong className="font-semibold text-slate-300">Full R&D Technical Report</strong>, then open companion
          specs for Match Intelligence, platform evaluation (Cursor, Lovable, APIs vs Adobe),
          productionisation (UK + SA teams), AI-era security (2FA, Mimecast, Transfon, Venture DK) and Gateway evidence.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {reports.map((report) => (
          <Panel key={report.href} title={report.title}>
            <p className="text-sm text-slate-300">{report.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={report.href}
                {...(report.href.startsWith("/api/") ? { target: "_blank", rel: "noreferrer" } : {})}
                className="inline-flex rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black hover:opacity-95"
              >
                {report.primaryLabel ?? "Open report →"}
              </Link>
              {report.secondaryHref ? (
                <a
                  href={report.secondaryHref}
                  className="inline-flex rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#111816]"
                >
                  {report.secondaryLabel}
                </a>
              ) : null}
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Match Intelligence & editorial R&D">
        <p className="mb-4 text-sm text-slate-300">
          Match Report Builder, MIO, preview scoring, F365 calibration and publish gates. Documented in Section 4 of the
          full technical report.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {matchIntelligenceDocs.map((doc) => (
            <DocumentCard key={doc.href} doc={doc} />
          ))}
        </div>
      </Panel>

      <Panel title="Security incident & vulnerability register">
        <p className="text-sm text-slate-300">
          Security incidents belong in the R&D evidence file. When AI platforms contributed to credential exposure or
          unauthorised AWS provisioning, record root cause, vulnerability class and remediation — that is the
          technical record of what broke and what was tried next.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Use the template below: <strong className="font-semibold text-slate-300">Security incident & vulnerability log</strong>.
          Assign sequential IDs (e.g. SEC-2026-001). Redact sensitive detail for external sharing. Formal ICO or
          insurer notification is separate where UK GDPR requires it.
        </p>
      </Panel>

      <Panel title="R&D evidence reminder">
        <p className="text-sm text-slate-300">
          R&D is not only about successful outcomes. Keep evidence of failed prototypes, blocked approaches, parsing
          errors, model/prompt experiments, rejected workflows, API limitations, latency issues, rights/provenance
          trade-offs, <strong className="font-semibold text-slate-200">security incidents and vulnerabilities</strong>,
          and manual barriers that the platform is trying to remove.
        </p>
      </Panel>

      <RdEvidenceTemplatePanel />

      <Panel title="Gateway R&D evidence">
        {rdEvidence.length ? (
          <div className="space-y-3">
            {rdEvidence.map((item) => (
              <article key={item.id} className="rounded-lg border border-[#1f2d26] bg-[#0a0e0c] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    {item.mode.startsWith("rd_security") ? (
                      <span className="rounded-full bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                        Security
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-slate-300">{item.content}</p>
                {item.linkedFiles.length ? (
                  <p className="mt-2 text-xs text-slate-500">Files: {item.linkedFiles.join(", ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300">
            No Gateway R&D evidence has been saved yet. Use the R&D action in Plexa Gateway to capture product
            experiments, blockers, prompt tests and technical uncertainty.
          </p>
        )}
      </Panel>

      <Link href="/admin" className="inline-flex text-sm font-semibold text-[#22c55e] hover:underline">
        Back to Admin →
      </Link>
    </div>
  );
}
