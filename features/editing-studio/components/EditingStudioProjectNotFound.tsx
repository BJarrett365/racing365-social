import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import { editingStudioDashboardPath, editingStudioNewProjectPath } from "@/features/editing-studio/utils/routes";

type Props = {
  projectId: string;
};

export function EditingStudioProjectNotFound({ projectId }: Props) {
  return (
    <EditingStudioPageFrame
      title="Project not found"
      description="This project may have been removed or the link is incorrect."
      actions={
        <Link
          href={editingStudioDashboardPath()}
          className="text-sm font-medium text-[color:var(--accent)] hover:underline"
        >
          ← Dashboard
        </Link>
      }
    >
      <Panel title="Nothing here">
        <p className="font-mono text-sm text-[color:var(--text-secondary)]">{projectId}</p>
        <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
          Return to the dashboard or create a new project.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={editingStudioDashboardPath()}
            className="inline-flex rounded-lg border border-transparent bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-hover)]"
          >
            Go to dashboard
          </Link>
          <Link
            href={editingStudioNewProjectPath()}
            className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]"
            style={{ borderColor: "var(--border)" }}
          >
            New project
          </Link>
        </div>
      </Panel>
    </EditingStudioPageFrame>
  );
}
