import { Suspense } from "react";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";
import { VerifyEmailForm } from "@/app/verify-email/VerifyEmailForm";

export const metadata = {
  title: `Verify Email · ${BRAND_SUITE}`,
};

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Account Verification</p>
        <h1 className="mt-1 text-3xl font-black text-white">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-400">Set your password to activate your Planet Sport Studio account.</p>
      </div>
      <Panel title="Verify Email" className="p-5">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading verification...</p>}>
          <VerifyEmailForm />
        </Suspense>
      </Panel>
    </div>
  );
}
