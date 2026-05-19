export function R365Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:translate-y-px";
  const styles =
    variant === "primary"
      ? "border border-transparent bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)] active:brightness-95"
      : variant === "danger"
        ? "border border-[color:var(--danger)] bg-transparent text-[color:var(--danger)] hover:bg-[var(--danger-soft)] active:brightness-95"
        : "border text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[color:var(--text-primary)] active:bg-[var(--surface-muted)]";
  return (
    <button
      type={type}
      className={`${base} ${styles} ${className}`.trim()}
      style={variant === "ghost" ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
