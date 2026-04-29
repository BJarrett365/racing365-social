import type { EditingProject } from "@/features/editing-studio/types/domain";
import { editorialProjectSettingsSchema } from "@/features/editing-studio/validators/editing-studio-schemas";

const BRAND_MAX = 120;

/**
 * Inline validation for the Settings tab (editorial metadata + scheduling).
 */
export function validateSettingsProjectFields(project: EditingProject): Record<string, string> {
  const errors: Record<string, string> = {};

  const brand = project.brand?.trim() ?? "";
  if (brand.length > BRAND_MAX) {
    errors.brand = `Brand must be ${BRAND_MAX} characters or fewer.`;
  }

  const esParsed = editorialProjectSettingsSchema.safeParse(project.editorialSettings ?? {});
  if (!esParsed.success) {
    for (const issue of esParsed.error.issues) {
      const path = issue.path.join(".") || "editorialSettings";
      if (errors[path] === undefined) {
        errors[path] = issue.message;
      }
    }
  }

  if (project.status === "scheduled" && !project.scheduledAt?.trim()) {
    errors.scheduledAt = "Set a publish time when status is scheduled.";
  }

  return errors;
}
