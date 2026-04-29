import type { Metadata } from "next";
import { BRAND_SUITE } from "@/app/lib/brand";
import { GuardRailsForm } from "@/app/guard-rails/GuardRailsForm";

export const metadata: Metadata = {
  title: `Guard Rails · ${BRAND_SUITE}`,
  description: "Edit AI template guard rails used by script generation.",
};

export default function GuardRailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Guard Rails</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Define format-specific AI writing boundaries for templates. These rules are appended to AI script prompts.
        </p>
      </div>
      <GuardRailsForm />
    </div>
  );
}
