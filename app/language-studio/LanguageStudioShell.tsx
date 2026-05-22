"use client";

import dynamic from "next/dynamic";

const LanguageStudioClient = dynamic(
  () =>
    import("@/app/language-studio/LanguageStudioClient").then((mod) => ({
      default: mod.LanguageStudioClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[color:var(--text-muted)]">Loading Language Studio…</p>
      </div>
    ),
  },
);

export function LanguageStudioShell() {
  return <LanguageStudioClient />;
}
