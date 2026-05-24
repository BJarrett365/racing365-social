import type { OptaPlayerIntelligence } from "@/app/lib/match-report/opta-player-types";

/** Post-prototype direct Opta API adapter — returns 501 until credentials exist. */
export async function importOptaApiPlayerData(_optaMatchId: string): Promise<OptaPlayerIntelligence> {
  throw new Error("Direct Opta API is not implemented. Use WhoScored URL in V1 prototype.");
}
