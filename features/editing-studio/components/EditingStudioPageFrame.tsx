import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional actions row (e.g. primary buttons). */
  actions?: ReactNode;
};

export function EditingStudioPageFrame({ title, description, children, actions }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Editing Studio
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[color:var(--text-primary)]">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
