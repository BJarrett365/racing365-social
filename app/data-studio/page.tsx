import Link from "next/link";
import { DataStudioClient } from "@/app/data-studio/DataStudioClient";
import { R365Button } from "@/app/components/R365Button";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Data Studio · ${BRAND_SUITE}`,
};

export default function DataStudioPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#1e293b] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_32%),#070b12] px-6 py-10 shadow-2xl md:px-10">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-400">Data Studio</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
            Previews, reports and sport-wide learning.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Standalone hub for structured sports data — match{" "}
            <strong className="font-semibold text-white">previews</strong> (Football365-style where relevant) and{" "}
            <strong className="font-semibold text-white">reports</strong> across Planet Sport verticals. Reports can reuse
            preview context when it stays accurate; prompts live in the shared{" "}
            <strong className="font-semibold text-white">Prompts</strong> library for football, rugby, cricket, tennis, F1 and
            beyond. Pair feeds with the{" "}
            <strong className="font-semibold text-white">learning library</strong>, then rewrite and translate in Language
            Studio.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/article-studio">
              <R365Button variant="ghost">Article Studio</R365Button>
            </Link>
            <Link href="/language-studio">
              <R365Button variant="ghost">Language Studio</R365Button>
            </Link>
            <Link href="/prompts">
              <R365Button variant="ghost">Prompts</R365Button>
            </Link>
          </div>
        </div>
      </section>

      <DataStudioClient />
    </div>
  );
}
