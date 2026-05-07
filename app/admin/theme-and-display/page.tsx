import Link from "next/link";
import { ThemeSettingsPanel } from "@/app/admin/ThemeSettingsPanel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Theme and display · ${BRAND_SUITE}`,
};

export default function ThemeAndDisplayPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-[#22c55e] hover:underline">Back to Admin</Link>
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Appearance</p>
        <h1 className="mt-1 text-3xl font-black text-white">Theme and display</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Manage Planet Sport Studio display settings, visual defaults and theme controls.
        </p>
      </section>
      <ThemeSettingsPanel />
    </div>
  );
}
