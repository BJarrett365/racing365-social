"use client";

import Link from "next/link";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import { liveControlNewFromEditingProjectPath } from "@/features/editing-studio/utils/routes";

const btnClass =
  "inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--surface-hover)]";
const btnStyle = { borderColor: "var(--border)", color: "var(--text-primary)" } as const;

type Props = {
  project: EditingProject;
  /** Block navigation when there are unsaved changes (caller confirms). */
  onBeforeNavigate?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Entry points to Live Control — keeps routes in `/live/*`; only passes query + server handoff API.
 */
export function EditingStudioLiveActions({ project, onBeforeNavigate }: Props) {
  const id = project.id;
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Live Control actions">
      <Link
        href={liveControlNewFromEditingProjectPath(id, "create")}
        onClick={onBeforeNavigate}
        className={btnClass}
        style={btnStyle}
      >
        Create Live Session from project
      </Link>
      <Link
        href={liveControlNewFromEditingProjectPath(id, "send_live")}
        onClick={onBeforeNavigate}
        className={btnClass}
        style={btnStyle}
      >
        Send to Live
      </Link>
      <p className="text-xs text-[color:var(--text-muted)]">
        Opens Live Control with title, summary, brand, source URL, and asset references prefilled.
      </p>
    </div>
  );
}
