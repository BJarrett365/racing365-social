import type { ReactNode } from "react";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--surface-muted)] ${className}`}
      aria-hidden
    />
  );
}

function SkeletonPanel({ children }: { children: ReactNode }) {
  return (
    <section
      className="flex flex-col rounded-xl border"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-card)" }}
    >
      <div className="panel-title-row">
        <SkeletonBlock className="h-3 w-24" />
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

export function EditingStudioDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-44" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border"
            style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
          >
            <SkeletonBlock className="h-full w-full rounded-[10px] opacity-60" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPanel key={i}>
            <SkeletonBlock className="h-20 w-full" />
          </SkeletonPanel>
        ))}
      </div>
      <SkeletonPanel>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 w-full" />
          ))}
        </div>
      </SkeletonPanel>
    </div>
  );
}
