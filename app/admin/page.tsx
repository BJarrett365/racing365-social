import { AdminSettingsForm } from "@/app/admin/AdminSettingsForm";
import { LanguageStudioSettingsForm } from "@/app/admin/LanguageStudioSettingsForm";
import { UserManagementPanel } from "@/app/admin/UserManagementPanel";
import Link from "next/link";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Admin · ${BRAND_SUITE}`,
};

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Platform</p>
        <h1 className="mt-1 text-3xl font-black text-white">Admin</h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Configure API keys and tool paths for this machine. In production, set{" "}
          <code className="text-slate-500">ADMIN_TOKEN</code> in the server environment and enter it below to save.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Product and environment notes are now on{" "}
          <Link href="/admin/about" className="text-[#22c55e] hover:underline">
            Admin About
          </Link>
          . Theme reference is on{" "}
          <Link href="/admin/theme-preview" className="text-[#22c55e] hover:underline">
            Theme Preview
          </Link>
          .
        </p>
      </div>
      <UserManagementPanel />
      <AdminSettingsForm />
      <LanguageStudioSettingsForm />
    </div>
  );
}
