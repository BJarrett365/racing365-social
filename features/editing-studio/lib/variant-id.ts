/** Client-safe copy variant id (browser or Node). */
export function newClientCopyVariantId(): string {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return `cv-${globalThis.crypto.randomUUID()}`;
  }
  return `cv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
