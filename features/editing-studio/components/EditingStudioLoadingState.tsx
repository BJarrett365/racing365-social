export function EditingStudioLoadingState() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl border p-8" style={{ borderColor: "var(--border)" }}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "var(--r365-gold)", borderTopColor: "transparent" }}
        aria-hidden
      />
      <p className="text-sm text-[color:var(--text-secondary)]">Loading Editing Studio…</p>
    </div>
  );
}
