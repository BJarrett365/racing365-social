"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import { EditingStudioProjectSubNav } from "@/features/editing-studio/components/EditingStudioProjectSubNav";
import { RevisionHistoryDrawer } from "@/features/editing-studio/components/RevisionHistoryDrawer";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import { getEditingProjectDisplayTitle } from "@/features/editing-studio/utils/project-display";
import { editingStudioDashboardPath, editingStudioProjectPath } from "@/features/editing-studio/utils/routes";

type Props = {
  projectId: string;
  project: EditingProject;
};

export function EditingStudioHistoryPageClient({ projectId, project }: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <EditingStudioPageFrame
      title={getEditingProjectDisplayTitle(project)}
      description="Revision history and audit trail for this project."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href={editingStudioProjectPath(projectId)}
            className="text-sm font-medium text-[color:var(--accent)] hover:underline"
          >
            ← Editor
          </Link>
          <Link href={editingStudioDashboardPath()} className="text-sm font-medium text-[color:var(--accent)] hover:underline">
            Dashboard
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <EditingStudioProjectSubNav projectId={projectId} active="history" />
        <Panel title="History">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Browse revisions, compare to the last saved version, and roll back. The drawer opens automatically; you can reopen it
            below.
          </p>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-3 rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)]"
          >
            Open revision history
          </button>
        </Panel>
      </div>

      <RevisionHistoryDrawer
        projectId={projectId}
        currentProject={project}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRollbackComplete={() => router.refresh()}
      />
    </EditingStudioPageFrame>
  );
}
