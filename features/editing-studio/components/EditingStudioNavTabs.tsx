import Link from "next/link";
import { usePathname } from "next/navigation";
import { editingStudioCalendarPath } from "@/features/editing-studio/utils/fixture-routes";
import { editingStudioDashboardPath } from "@/features/editing-studio/utils/routes";

type TabId = "calendar" | "fixtures" | "projects";

const tabs: Array<{ id: TabId; label: string; href: string }> = [
  { id: "calendar", label: "Calendar", href: editingStudioCalendarPath() },
  { id: "fixtures", label: "Fixtures", href: `${editingStudioDashboardPath()}?tab=fixtures` },
  { id: "projects", label: "Projects", href: `${editingStudioDashboardPath()}?tab=projects` },
];

function activeTab(pathname: string, search: string): TabId {
  if (pathname.endsWith("/calendar")) return "calendar";
  const tab = new URLSearchParams(search).get("tab");
  if (tab === "fixtures") return "fixtures";
  return "projects";
}

type Props = {
  search?: string;
};

export function EditingStudioNavTabs({ search = "" }: Props) {
  const pathname = usePathname() ?? "";
  const current = activeTab(pathname, search);

  return (
    <nav
      className="mb-6 flex flex-wrap gap-1 rounded-xl border p-1"
      style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      aria-label="Schedule Studio sections"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
