import { randomBytes } from "crypto";

export function newLiveSessionId(): string {
  return `ls-${randomBytes(8).toString("hex")}`;
}
