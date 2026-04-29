import type { ReactNode } from "react";

type Props = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function EditingStudioEmptyState({ title, message, action }: Props) {
  return (
    <div
      className="rounded-xl border border-dashed p-10 text-center"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <p className="text-lg font-semibold text-[color:var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{message}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
