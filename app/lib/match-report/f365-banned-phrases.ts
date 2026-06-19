/** Authoritative F365 banned phrases — calibration doc §7. Each hit → −0.25 readability (cap −3.0). */
export const F365_BANNED_PHRASES = [
  "clash",
  "mouthwatering",
  "all eyes will be on",
  "fascinating encounter",
  "set to lock horns",
  "huge test",
  "must-watch",
  "anything can happen",
  "throw the form book out",
  "six-pointer",
  "battle royale",
  "titanic struggle",
  "footballing giant",
  "will be hoping to",
  "will be looking to",
  "could prove decisive",
  "in-form star",
  "crunch match",
  "game of two halves",
  "fine margins",
  "at the end of the day",
  "moving forward",
  "gave 110%",
  "deserved all three points",
  "hard-fought victory",
  "statement win",
  "cagey affair",
  "entertaining encounter",
  "quality outfit",
  "world-class talent",
  "lock horns",
  "title showdown",
  "relegation six-pointer",
] as const;

const READABILITY_PENALTY_PER_HIT = 0.25;
const READABILITY_PENALTY_CAP = 3.0;

export function findBannedPhraseHits(text: string): string[] {
  const lower = text.toLowerCase();
  return F365_BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

export function bannedPhraseReadabilityPenalty(hits: string[]): number {
  return Math.min(hits.length * READABILITY_PENALTY_PER_HIT, READABILITY_PENALTY_CAP);
}
