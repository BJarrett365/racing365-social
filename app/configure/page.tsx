import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Configure · ${BRAND_SUITE}`,
};

const configureCards = [
  {
    title: "Knowledge Base",
    href: "/knowledge-base",
    description:
      "Manage URLs, files, source brands, creator profiles, sport rules, prompt rules and approved AI learning.",
    cta: "Open Knowledge Base",
  },
  {
    title: "Tools",
    href: "/tools",
    description: "Import, convert and prepare source material for studio, article, audio and video workflows.",
    cta: "Open Tools",
  },
  {
    title: "Integrations",
    href: "/admin/provider-keys-and-platform-services",
    description: "Manage provider keys and connected services including OpenAI, ElevenLabs, Runway and Supabase.",
    cta: "Open Integrations",
  },
  {
    title: "Deploy",
    href: "/live",
    description: "Access live control, delivery settings and publishing workflows for production output.",
    cta: "Open Deploy",
  },
];

export default function ConfigurePage() {
  return (
    <div className="space-y-8">
      <section
        className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">Configure</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">
          Configure Studio intelligence and delivery.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[color:var(--text-secondary)]">
          Set up the knowledge, tools, integrations and deployment controls that keep Planet Sport Studio production-ready.
        </p>
      </section>

      <Panel title="Configure">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {configureCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-xl font-black text-[color:var(--text-primary)]">{card.title}</h2>
              <p className="mt-3 min-h-[96px] text-sm leading-6 text-[color:var(--text-secondary)]">{card.description}</p>
              <span className="mt-5 inline-flex text-sm font-bold text-[color:var(--accent)]">
                {card.cta} <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
