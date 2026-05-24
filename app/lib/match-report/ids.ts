export function newMatchReportProjectId(): string {
  return `mrpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
