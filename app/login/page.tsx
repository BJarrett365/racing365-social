import Link from "next/link";
import { Suspense } from "react";
import { Panel } from "@/app/components/Panel";
import { LoginForm } from "@/app/login/LoginForm";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Login · ${BRAND_SUITE}`,
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Secure Access</p>
        <h1 className="mt-1 text-3xl font-black text-white">Log in to Plexa Studio</h1>
        <p className="mt-2 text-sm text-slate-400">Plexa Studio is private. Use a verified account to access the platform.</p>
      </div>
      <Panel title="Login" className="p-5">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading login...</p>}>
          <LoginForm />
        </Suspense>
      </Panel>
      <p className="text-xs text-slate-500">
        First time hosting Plexa Studio? Create the first admin on{" "}
        <Link href="/setup" className="text-[#22c55e] hover:underline">Setup</Link>.
      </p>
    </div>
  );
}
