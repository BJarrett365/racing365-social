import Link from "next/link";
import { CronsPanel } from "@/app/admin/crons/CronsPanel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Crons · ${BRAND_SUITE}`,
};

export default function CronsPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-[#22c55e] hover:underline">Back to Admin</Link>
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Automation</p>
        <h1 className="mt-1 text-3xl font-black text-white">Crons</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Switch scheduled content collection on or off, assign feeds to clients and monitor failures before they block the newsroom.
        </p>
      </section>
      <CronsPanel />
    </div>
  );
}
