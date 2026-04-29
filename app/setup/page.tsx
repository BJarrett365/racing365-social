import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";
import { SetupForm } from "@/app/setup/SetupForm";

export const metadata = {
  title: `Setup · ${BRAND_SUITE}`,
};

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">First Admin</p>
        <h1 className="mt-1 text-3xl font-black text-white">Set up secure access</h1>
        <p className="mt-2 text-sm text-slate-400">
          Create the first verified administrator. After this, new accounts are invited from Admin.
        </p>
      </div>
      <Panel title="Create First Admin" className="p-5">
        <SetupForm />
      </Panel>
    </div>
  );
}
