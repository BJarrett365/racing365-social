export function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-xl border ${className}`}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="panel-title-row">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em]">{title}</h2>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
