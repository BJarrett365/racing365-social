import type { AiCallLogEntry, AiProviderId, AiTask } from "@/app/lib/ai/types";

const MAX_LOG_ENTRIES = 500;
const logBuffer: AiCallLogEntry[] = [];

let logIdCounter = 0;

export function recordAiCall(entry: Omit<AiCallLogEntry, "id" | "timestamp">): AiCallLogEntry {
  const full: AiCallLogEntry = {
    ...entry,
    id: `ai-${++logIdCounter}-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  logBuffer.unshift(full);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.length = MAX_LOG_ENTRIES;
  }
  return full;
}

export function getAiCallLogs(opts?: { limit?: number; task?: AiTask; provider?: AiProviderId }): AiCallLogEntry[] {
  let entries = [...logBuffer];
  if (opts?.task) entries = entries.filter((e) => e.task === opts.task);
  if (opts?.provider) entries = entries.filter((e) => e.provider === opts.provider);
  const limit = opts?.limit ?? 50;
  return entries.slice(0, limit);
}

/** Test helper — clears in-memory log buffer. */
export function clearAiCallLogs(): void {
  logBuffer.length = 0;
  logIdCounter = 0;
}
