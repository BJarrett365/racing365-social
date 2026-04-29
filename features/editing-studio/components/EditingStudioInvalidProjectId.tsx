import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import { editingStudioDashboardPath } from "@/features/editing-studio/utils/routes";

type Props = {
  rawId: string;
};

export function EditingStudioInvalidProjectId({ rawId }: Props) {
  return (
    <EditingStudioPageFrame
      title="Invalid project"
      description="This project link is not valid. Use an ID with letters, numbers, underscores, or hyphens."
      actions={
        <Link href={editingStudioDashboardPath()} className="text-sm font-medium text-[color:var(--accent)] hover:underline">
          ← Dashboard
        </Link>
      }
    >
      <Panel title="Error">
        <p className="text-sm text-[color:var(--danger)]">Unrecognised project id: {rawId}</p>
      </Panel>
    </EditingStudioPageFrame>
  );
}
