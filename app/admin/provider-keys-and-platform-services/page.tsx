import Link from "next/link";
import { AdminSettingsForm } from "@/app/admin/AdminSettingsForm";
import { LanguageStudioSettingsForm } from "@/app/admin/LanguageStudioSettingsForm";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Provider keys and platform services · ${BRAND_SUITE}`,
};

export default function ProviderKeysAndPlatformServicesPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-[#22c55e] hover:underline">Back to Admin</Link>
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Environment</p>
        <h1 className="mt-1 text-3xl font-black text-white">Provider keys and platform services</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Manage AI, video, live, meeting-room, translation, and database (Supabase) settings in one place.
        </p>
      </section>
      <AdminSettingsForm />
      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Language Studio</p>
          <h2 className="mt-1 text-2xl font-black text-white">Translation and localisation providers</h2>
        </div>
        <LanguageStudioSettingsForm />
      </section>
    </div>
  );
}
