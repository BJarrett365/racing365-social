import type { EditingRevisionActor } from "@/features/editing-studio/types/domain";

/**
 * Optional identity for revision history. Send from the client via headers when you have auth:
 * - `x-editing-user-id`
 * - `x-editing-user-name`
 * - `x-editing-user-email`
 */
export function getEditingRevisionActorFromRequest(req: Request): EditingRevisionActor {
  const userId = req.headers.get("x-editing-user-id")?.trim() || undefined;
  const displayName = req.headers.get("x-editing-user-name")?.trim() || undefined;
  const email = req.headers.get("x-editing-user-email")?.trim() || undefined;
  return {
    userId,
    displayName,
    email,
    source: "api",
  };
}

export function formatEditingRevisionActorLabel(actor: EditingRevisionActor | undefined): string {
  if (!actor) return "Unknown";
  const name = actor.displayName?.trim();
  if (name) return name;
  const email = actor.email?.trim();
  if (email) return email;
  const id = actor.userId?.trim();
  if (id) return `User ${id}`;
  return "Unknown";
}
