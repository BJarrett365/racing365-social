/** Prefer header; body used for POST JSON routes. */
export function readAdminTokenFromRequest(request: Request, bodyToken?: string): string | undefined {
  return request.headers.get("x-admin-token")?.trim() || bodyToken?.trim();
}
