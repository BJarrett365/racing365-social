import type { EditingProject, EditingProjectStatus, PlatformType } from "@/features/editing-studio/types/domain";

export function isDraftBucket(p: EditingProject): boolean {
  return p.status === "draft" || p.status === "in_review" || p.status === "approved";
}

export function isScheduledBucket(p: EditingProject): boolean {
  return p.status === "scheduled";
}

export function isPublishedBucket(p: EditingProject): boolean {
  return p.status === "published";
}

export type DashboardFilters = {
  search: string;
  status: "all" | EditingProjectStatus;
  brand: string;
  platform: "all" | PlatformType;
};

export function filterEditingProjects(
  projects: EditingProject[],
  f: DashboardFilters,
  options?: { excludeArchived?: boolean },
): EditingProject[] {
  const excludeArchived = options?.excludeArchived ?? false;
  const q = f.search.trim().toLowerCase();
  return projects.filter((p) => {
    if (excludeArchived && p.status === "archived") return false;
    if (q) {
      const hay = `${p.title} ${p.description ?? ""} ${p.brand ?? ""} ${p.sourceUrl ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.status !== "all" && p.status !== f.status) return false;
    if (f.brand !== "all" && (p.brand ?? "").trim() !== f.brand.trim()) return false;
    if (f.platform !== "all" && !p.platforms.includes(f.platform)) return false;
    return true;
  });
}

export function sortByUpdatedDesc(projects: EditingProject[]): EditingProject[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function uniqueBrands(projects: EditingProject[]): string[] {
  const s = new Set<string>();
  for (const p of projects) {
    const b = (p.brand ?? "").trim();
    if (b) s.add(b);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}
