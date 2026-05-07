import Link from "next/link";
import { ArticleAutomationsPanel } from "@/app/admin/article-automations/ArticleAutomationsPanel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Article Automations · ${BRAND_SUITE}`,
};

export default function ArticleAutomationsPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-[#22c55e] hover:underline">Back to Admin</Link>
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Language automation</p>
        <h1 className="mt-1 text-3xl font-black text-white">Article Automations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Manage rewrite and translation rules separately from feed crons, so imported content can be prepared for clients while still landing in Review Queue for manual intervention.
        </p>
      </section>
      <ArticleAutomationsPanel />
    </div>
  );
}
