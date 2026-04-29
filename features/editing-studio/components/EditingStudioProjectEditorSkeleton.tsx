/**
 * Layout skeleton matching the three-column editor (left / centre / preview).
 */
export function EditingStudioProjectEditorSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading editor">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-muted)]" />
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-[var(--surface-muted)]" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
      </div>
      <div className="flex min-h-[min(70vh,720px)] flex-col gap-4 xl:flex-row">
        <aside className="w-full shrink-0 space-y-3 xl:w-64">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border bg-[var(--surface-muted)]"
              style={{ borderColor: "var(--border)" }}
            />
          ))}
        </aside>
        <main className="min-h-0 min-w-0 flex-1">
          <div
            className="flex h-full min-h-[280px] animate-pulse flex-col rounded-xl border bg-[var(--surface-muted)]"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex gap-1 border-b p-2" style={{ borderColor: "var(--border)" }}>
              {[1, 2, 3, 4, 5].map((t) => (
                <div key={t} className="h-8 w-20 rounded-md bg-[var(--surface)]" />
              ))}
            </div>
            <div className="flex-1 p-4">
              <div className="h-4 w-[75%] max-w-md rounded bg-[var(--surface)]" />
              <div className="mt-4 h-32 rounded-lg bg-[var(--surface)]" />
            </div>
          </div>
        </main>
        <aside className="w-full shrink-0 xl:w-80">
          <div
            className="mx-auto max-w-[360px] animate-pulse rounded-[2rem] border bg-[var(--surface-muted)] p-4"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="mx-auto aspect-[9/16] max-h-[420px] rounded-2xl bg-[var(--surface)]" />
          </div>
        </aside>
      </div>
    </div>
  );
}
