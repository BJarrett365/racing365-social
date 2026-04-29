import Link from "next/link";
import {
  editingStudioProjectHistoryPath,
  editingStudioProjectPath,
  editingStudioProjectPreviewPath,
} from "@/features/editing-studio/utils/routes";

type Props = {
  projectId: string;
  active: "overview" | "preview" | "history";
};

const linkClass = "rounded-md px-3 py-1.5 text-sm font-medium transition";
const inactiveStyle = { color: "var(--text-secondary)" as const };
const activeStyle = {
  color: "var(--text-primary)" as const,
  background: "var(--surface-hover)" as const,
  borderColor: "var(--border)" as const,
};

export function EditingStudioProjectSubNav({ projectId, active }: Props) {
  const base = editingStudioProjectPath(projectId);
  const items: Array<{ key: Props["active"]; href: string; label: string }> = [
    { key: "overview", href: base, label: "Overview" },
    { key: "preview", href: editingStudioProjectPreviewPath(projectId), label: "Preview" },
    { key: "history", href: editingStudioProjectHistoryPath(projectId), label: "History" },
  ];
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border)" }} aria-label="Project sections">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`${linkClass} border ${isActive ? "" : "border-transparent"}`}
            style={isActive ? activeStyle : inactiveStyle}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
