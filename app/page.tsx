import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE_UPPER } from "@/app/lib/brand";
import {
  NAV_GROUP_LABEL,
  NAV_GROUP_ORDER,
  NEWS_SHORTS_CARDS,
  PRIMARY_STUDIO_CARDS,
  SUPPORT_CARDS,
  type StudioDashboardCard,
} from "@/app/lib/studio-entries";

function StudioDashboardCardBlock({ card }: { card: StudioDashboardCard }) {
  const panelBody = (
    <Panel title={card.title}>
      <div className="flex h-full flex-col">
        {card.status ? (
          <div className="mb-2 flex justify-end">
            <span className="rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
              {card.status}
            </span>
          </div>
        ) : null}
        <p className="mt-2 text-sm font-semibold text-[color:var(--text-secondary)]">{card.heading}</p>
        <p className="mt-2 flex-1 text-sm leading-6 text-[color:var(--text-muted)]">{card.description}</p>
        <span
          className={`mt-6 inline-flex text-sm font-semibold ${
            card.accent === "muted"
              ? "text-[color:var(--text-secondary)]"
              : card.accent === "gold"
                ? "text-[#eab308]"
                : "text-[#22c55e]"
          }`}
        >
          {card.cta}
          {card.status ? null : " →"}
        </span>
      </div>
    </Panel>
  );

  if (card.status) {
    return (
      <div
        className="rounded-2xl opacity-[0.92] ring-1 ring-[color:var(--border)]"
        aria-label={`${card.title} (${card.status})`}
      >
        {panelBody}
      </div>
    );
  }

  return (
    <Link href={card.href} className="block transition hover:-translate-y-0.5 hover:opacity-95">
      {panelBody}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="max-w-3xl">
        {BRAND_SUITE_UPPER ? (
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">{BRAND_SUITE_UPPER}</p>
        ) : null}
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">
          Planet Sport Studio Control Room
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Create short videos, social images, captions, articles and multilingual outputs from one AI-powered production
          hub. Choose a studio, shape the story, then publish or export with the right assets ready.
        </p>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Tip: use{" "}
          <strong className="text-[color:var(--text-secondary)]">Studios</strong> in the header for quick jumps — or{" "}
          <Link href="/#studios" className="font-semibold text-[#22c55e] underline-offset-2 hover:underline">
            jump to the studio grid
          </Link>{" "}
          on mobile.
        </p>
      </div>

      <div id="studios" className="scroll-mt-28 space-y-10 md:scroll-mt-24">
        {NAV_GROUP_ORDER.map((group) => {
          const cards = PRIMARY_STUDIO_CARDS.filter((c) => c.navGroup === group);
          if (cards.length === 0) return null;
          const headingId = `studio-group-${group}`;
          return (
            <section key={group} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--text-muted)]"
              >
                {NAV_GROUP_LABEL[group]}
              </h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <StudioDashboardCardBlock key={card.title} card={card} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Panel title="News Shorts & Social Image">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {NEWS_SHORTS_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="block rounded-xl border border-[#1f2d26] bg-black/20 p-4 transition hover:border-[#22c55e]/60"
            >
              <h2 className="text-xl font-bold text-[color:var(--text-primary)]">{card.title}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-300">{card.heading}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
              <span className="mt-6 inline-flex text-sm font-semibold text-[#22c55e]">{card.cta} →</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Support">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {SUPPORT_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-lg border border-[#1f2d26] bg-black/20 p-3 transition hover:border-[#22c55e]/60"
            >
              <p className="text-sm font-bold text-[color:var(--text-primary)]">{card.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
