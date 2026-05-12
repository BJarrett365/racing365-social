import { Suspense } from "react";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";

export const metadata = {
  title: `Reset password · ${BRAND_SUITE}`,
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Account recovery</p>
        <h1 className="mt-1 text-3xl font-black text-white">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-400">After saving you will be signed in automatically.</p>
      </div>
      <Panel title="New password" className="p-5">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </Panel>
    </div>
  );
}
