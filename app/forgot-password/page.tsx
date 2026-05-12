import Link from "next/link";
import { Suspense } from "react";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";
import { ForgotPasswordForm } from "@/app/forgot-password/ForgotPasswordForm";

export const metadata = {
  title: `Forgot password · ${BRAND_SUITE}`,
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Account recovery</p>
        <h1 className="mt-1 text-3xl font-black text-white">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-400">Enter your work email. If we recognise the account, you will receive a link to choose a new password.</p>
      </div>
      <Panel title="Reset by email" className="p-5">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <ForgotPasswordForm />
        </Suspense>
      </Panel>
      <p className="text-xs text-slate-500">
        First-time setup?{" "}
        <Link href="/setup" className="text-[#22c55e] hover:underline">
          Create the first admin
        </Link>
        . Invited but never set a password? Ask an admin to resend your invite instead.
      </p>
    </div>
  );
}
