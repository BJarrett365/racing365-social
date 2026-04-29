import { randomBytes } from "crypto";

export function newEditingStudioId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}
