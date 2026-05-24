import Link from "next/link";

export function MatchReportNav({ active }: { active: "generate" | "schedule" | "reports" }) {
  const base =
    "rounded-full px-4 py-2 text-sm font-semibold transition-colors";
  const activeClass = "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]";
  const idleClass =
    "border text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]";
  return (
    <nav className="flex flex-wrap gap-2">
      <Link
        href="/match-report-builder"
        className={`${base} ${active === "generate" ? activeClass : idleClass}`}
        style={active !== "generate" ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
      >
        Generate
      </Link>
      <Link
        href="/match-report-builder/schedule"
        className={`${base} ${active === "schedule" ? activeClass : idleClass}`}
        style={active !== "schedule" ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
      >
        Schedules
      </Link>
      <Link
        href="/match-report-builder/reports"
        className={`${base} ${active === "reports" ? activeClass : idleClass}`}
        style={active !== "reports" ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
      >
        All Reports
      </Link>
    </nav>
  );
}
