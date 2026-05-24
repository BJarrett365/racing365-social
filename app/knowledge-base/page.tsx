import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { KnowledgeAssistantPanel } from "@/app/knowledge-base/KnowledgeAssistantPanel";
import { BRAND_SUITE } from "@/app/lib/brand";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";

export const metadata = {
  title: `Knowledge Base · ${BRAND_SUITE}`,
};

export const dynamic = "force-dynamic";

type ActionCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  tag: string;
};

const addActions: ActionCard[] = [
  {
    title: "Add URL",
    description:
      "Import one article, feed or source page into Language Studio so the AI can rewrite, translate, review and learn from it.",
    href: "/language-studio?tab=Imports",
    cta: "Import URL",
    tag: "URL",
  },
  {
    title: "Add files",
    description:
      "Store editorial references, brand notes, market guidance and reusable source material as knowledge files.",
    href: "/language-studio?tab=Knowledge%20Files",
    cta: "Add files",
    tag: "Files",
  },
  {
    title: "Create text",
    description:
      "Write or paste internal guidance, prompt instructions, editorial checklists and reusable AI memory.",
    href: "/language-studio?tab=Knowledge%20Files",
    cta: "Create text",
    tag: "Text",
  },
  {
    title: "Create collection",
    description:
      "Group learning by source brand, creator, sport, market, prompt type or publishing destination.",
    href: "/language-studio?tab=Source%20Brands",
    cta: "Create collection",
    tag: "Folder",
  },
];

const learningCollections: ActionCard[] = [
  {
    title: "Source Brands",
    description: "Saved feeds, default sports, parser hints and source-specific import behaviour.",
    href: "/language-studio?tab=Source%20Brands",
    cta: "Manage sources",
    tag: "Sources",
  },
  {
    title: "Creator Profiles",
    description: "Journalist and content-creator style notes built from imports and manual editorial learning.",
    href: "/configure/content-creators",
    cta: "Manage creators",
    tag: "Creators",
  },
  {
    title: "Sport Rules",
    description: "Sport-specific terminology, data rules, protected stats and naming conventions.",
    href: "/language-studio?tab=Market%20Rules",
    cta: "Review rules",
    tag: "Sport",
  },
  {
    title: "Prompt Rules",
    description: "Reusable prompt instructions that guide rewrites, translations, social copy and reviews.",
    href: "/language-studio?tab=Prompt%20Rules",
    cta: "Edit prompts",
    tag: "Prompts",
  },
  {
    title: "Glossary",
    description: "Protected terms and approved language mappings for brands, sports and markets.",
    href: "/language-studio?tab=Glossary",
    cta: "Open glossary",
    tag: "Terms",
  },
  {
    title: "Protected Terms",
    description: "Names, teams, race terms and technical phrases that should not be altered incorrectly.",
    href: "/language-studio?tab=Protected%20Terms",
    cta: "Protect terms",
    tag: "Safety",
  },
  {
    title: "Guardrails",
    description: "Fact-safety, editorial-safety, rights, compliance and translation boundaries.",
    href: "/language-studio?tab=Guardrails",
    cta: "Open guardrails",
    tag: "Safety",
  },
  {
    title: "Brand Tone & Style",
    description: "Brand style guides and tone rules — e.g. TEAMtalk transfer authority — used by Match Report Builder and Language Studio AI.",
    href: "/configure/brand-style-guides",
    cta: "Open style guides",
    tag: "Brand",
  },
  {
    title: "Brand Guidelines",
    description: "Visual, tone and brand direction for Planet Sport Studio outputs.",
    href: "/brand-guidelines",
    cta: "Open guidelines",
    tag: "Brand",
  },
];

const configureLinks: ActionCard[] = [
  {
    title: "Tools",
    description: "Import, convert and prepare source material for studio projects.",
    href: "/tools",
    cta: "Open tools",
    tag: "Configure",
  },
  {
    title: "Integrations",
    description: "Manage provider keys and connected AI, video, translation and platform services.",
    href: "/admin/provider-keys-and-platform-services",
    cta: "Open integrations",
    tag: "Configure",
  },
  {
    title: "Deploy",
    description: "Access live controls, client delivery and publishing-ready export destinations.",
    href: "/live",
    cta: "Open deploy",
    tag: "Configure",
  },
];

const countLabels = [
  ["sourceBrands", "Source brands"],
  ["knowledgeFiles", "Knowledge files"],
  ["journalistProfiles", "Creator profiles"],
  ["sportRules", "Sport rules"],
  ["promptRules", "Prompt rules"],
  ["glossary", "Glossary terms"],
  ["protectedTerms", "Protected terms"],
  ["guardrails", "Guardrails"],
] as const;

function KnowledgeCard({ card }: { card: ActionCard }) {
  return (
    <Link
      href={card.href}
      className="group block rounded-2xl border bg-[color:var(--surface)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-black text-[color:var(--text-primary)]">{card.title}</h3>
        <span className="rounded-full border bg-[color:var(--accent-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[color:var(--primary)]" style={{ borderColor: "var(--border)" }}>
          {card.tag}
        </span>
      </div>
      <p className="mt-3 min-h-[72px] text-sm leading-6 text-[color:var(--text-secondary)]">{card.description}</p>
      <span className="mt-5 inline-flex text-sm font-bold text-[color:var(--accent)]">
        {card.cta} <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

export default async function KnowledgeBasePage() {
  const data = await readLanguageStudioData();
  const counts = Object.fromEntries(
    countLabels.map(([key, label]) => [label, Object.keys(data[key]).length]),
  );

  return (
    <div className="space-y-8">
      <section
        className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">Configure</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-[color:var(--text-primary)]">Knowledge Base</h1>
            <p className="mt-4 text-lg leading-8 text-[color:var(--text-secondary)]">
              Build the editorial memory that powers AI output: source sites, sports rules, creator styles, brand guidance,
              prompt rules, protected terms and approved learnings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/language-studio?tab=Imports">
              <R365Button>Add URL</R365Button>
            </Link>
            <Link href="/language-studio?tab=Knowledge%20Files">
              <R365Button variant="ghost">Add knowledge</R365Button>
            </Link>
          </div>
        </div>
      </section>

      <Panel title="Add to Knowledge Base">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {addActions.map((card) => (
            <KnowledgeCard key={card.title} card={card} />
          ))}
        </div>
      </Panel>

      <Panel title="AI Learning Sources">
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(counts).map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-[color:var(--surface-muted)] p-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-2xl font-black text-[color:var(--text-primary)]">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {learningCollections.map((card) => (
            <KnowledgeCard key={card.title} card={card} />
          ))}
        </div>
      </Panel>

      <Panel title="AI Governance Review">
        <KnowledgeAssistantPanel />
      </Panel>

      <Panel title="Configure">
        <div className="grid gap-4 md:grid-cols-3">
          {configureLinks.map((card) => (
            <KnowledgeCard key={card.title} card={card} />
          ))}
        </div>
      </Panel>

      <div className="rounded-2xl border bg-[color:var(--surface-muted)] p-5" style={{ borderColor: "var(--border)" }}>
        <p className="text-sm font-black text-[color:var(--text-primary)]">How this learns</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          The first version organises existing Language Studio knowledge. Imports create article records and creator
          profiles; approved review work, prompt rules, sport rules, glossary entries and knowledge files then guide future
          rewrites, translations, captions and social output.
        </p>
      </div>
    </div>
  );
}
