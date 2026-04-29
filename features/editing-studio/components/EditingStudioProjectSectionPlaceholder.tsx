import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { EditingStudioPageFrame } from "@/features/editing-studio/components/EditingStudioPageFrame";
import { EditingStudioProjectSubNav } from "@/features/editing-studio/components/EditingStudioProjectSubNav";
import type { EditingProject } from "@/features/editing-studio/types/domain";
import { editingStudioDashboardPath } from "@/features/editing-studio/utils/routes";

type Section = "overview" | "preview" | "history";

const SECTION_COPY: Record<Section, { title: string; blurb: string; panel: string }> = {
  overview: {
    title: "Project workspace",
    blurb: "Drafts, approvals, and asset slots will appear here.",
    panel: "Workspace (placeholder)",
  },
  preview: {
    title: "Preview",
    blurb: "Social / promo previews will render here before publishing.",
    panel: "Preview pane (placeholder)",
  },
  history: {
    title: "History",
    blurb: "Version history and audit trail will be listed here.",
    panel: "Revision history (placeholder)",
  },
};

type Props = {
  projectId: string;
  section: Section;
  /** When loaded server-side, shows title and source link (import flow). */
  project?: EditingProject | null;
};

export function EditingStudioProjectSectionPlaceholder({ projectId, section, project }: Props) {
  const copy = SECTION_COPY[section];
  const headline = project?.title ?? copy.title;
  return (
    <EditingStudioPageFrame
      title={headline}
      description={`${copy.blurb} Project: ${projectId}`}
      actions={
        <Link
          href={editingStudioDashboardPath()}
          className="text-sm font-medium text-[color:var(--accent)] hover:underline"
        >
          ← Dashboard
        </Link>
      }
    >
      <div className="space-y-4">
        <EditingStudioProjectSubNav projectId={projectId} active={section} />
        <Panel title={copy.panel}>
          <p className="font-mono text-xs text-[#eab308]">{projectId}</p>
          {project?.publicHeadline ? (
            <p className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">{project.publicHeadline}</p>
          ) : null}
          {project?.summary ? (
            <p className="mt-2 line-clamp-4 text-sm text-[color:var(--text-secondary)]">{project.summary}</p>
          ) : null}
          {project?.sourceUrl ? (
            <p className="mt-2 text-sm break-all text-[color:var(--text-secondary)]">
              Source:{" "}
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--accent)] hover:underline"
              >
                {project.sourceUrl}
              </a>
            </p>
          ) : null}
          {project?.bodyNotes ? (
            <details className="mt-3 text-sm text-[color:var(--text-secondary)]">
              <summary className="cursor-pointer font-medium text-[color:var(--text-primary)]">Body / notes</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-[color:var(--text-secondary)]">
                {project.bodyNotes}
              </pre>
            </details>
          ) : null}
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Placeholder layout only — full editor comes next.
          </p>
        </Panel>
      </div>
    </EditingStudioPageFrame>
  );
}
