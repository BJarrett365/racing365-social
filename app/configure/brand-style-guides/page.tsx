import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_STYLE_GUIDE_CATALOG } from "@/app/lib/brand-style-guides/catalog";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Brand Style Guides · ${BRAND_SUITE}`,
  description:
    "Official brand manuals (PDF), editorial tone, and AI instructions for video and social content across Football365, TEAMtalk and Planet Football.",
};

function InstructionBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-[color:var(--surface-muted)] p-4" style={{ borderColor: "var(--border)" }}>
      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--accent)]">{title}</h4>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--text-secondary)]">{body}</p>
    </div>
  );
}

export default function BrandStyleGuidesPage() {
  return (
    <div className="space-y-8">
      <section
        className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/configure" className="text-sm font-semibold text-[color:var(--accent)] hover:underline">
          ← Configure
        </Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">Configure</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">Brand Style Guides</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[color:var(--text-secondary)]">
          Official brand manuals plus AI instructions for editorial, video (Shorts, voiceover, Runway) and social copy.
          These guides feed Match Report Builder, Language Studio, News Shorts and brand-aware AI routes.
        </p>
        <p className="mt-4 text-sm text-[color:var(--text-secondary)]">
          Edit extended guideline text on{" "}
          <Link href="/brand-guidelines" className="font-semibold text-[color:var(--accent)] hover:underline">
            Brand Guidelines
          </Link>{" "}
          or manage knowledge files in{" "}
          <Link href="/language-studio?tab=Knowledge%20Files" className="font-semibold text-[color:var(--accent)] hover:underline">
            Language Studio
          </Link>
          .
        </p>
      </section>

      <div className="space-y-6">
        {BRAND_STYLE_GUIDE_CATALOG.map((guide) => (
          <Panel key={guide.id} title={guide.label}>
            <div className="space-y-5">
              <p className="text-sm leading-7 text-[color:var(--text-secondary)]">{guide.summary}</p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={guide.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border bg-[color:var(--accent-soft)] px-4 py-2.5 text-sm font-bold text-[color:var(--primary)] transition hover:border-[color:var(--accent)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Download brand manual (PDF)
                  <span aria-hidden="true">↗</span>
                </a>
                <span className="text-xs text-[color:var(--text-secondary)]">{guide.pdfFilename}</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <InstructionBlock title="AI — Editorial" body={guide.editorialInstruction} />
                <InstructionBlock title="AI — Video" body={guide.videoInstruction} />
                <InstructionBlock title="AI — Social" body={guide.socialInstruction} />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
