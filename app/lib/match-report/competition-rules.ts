import type { LanguageSportRule } from "@/app/lib/language-studio/types";
import type { SixLogicFacts } from "@/app/lib/match-report/types";

const COMPETITION_CODE_HINTS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /premier league/i, code: "EPL" },
  { pattern: /championship/i, code: "EFL_CHAMP" },
  { pattern: /league one/i, code: "EFL_L1" },
  { pattern: /league two/i, code: "EFL_L2" },
  { pattern: /fa cup/i, code: "FA_CUP" },
  { pattern: /carabao|efl cup|league cup/i, code: "EFL_CUP" },
  { pattern: /champions league/i, code: "UCL" },
  { pattern: /europa league/i, code: "UEL" },
  { pattern: /conference league/i, code: "UECL" },
  { pattern: /scottish premiership/i, code: "SPL" },
];

export type CompetitionRulesResult = {
  competitionCode?: string;
  sportRuleIds: string[];
  matchedSportRules: LanguageSportRule[];
};

export function inferCompetitionCode(competition: string): string | undefined {
  const hit = COMPETITION_CODE_HINTS.find((row) => row.pattern.test(competition));
  return hit?.code;
}

export function applyCompetitionRules(
  facts: SixLogicFacts,
  sportRules: LanguageSportRule[],
): CompetitionRulesResult {
  const competitionCode = facts.competitionCode ?? inferCompetitionCode(facts.competition);
  const matchedSportRules = sportRules.filter((row) => {
    if (!competitionCode) return true;
    const blob = `${row.sport} ${row.namingConventions} ${row.dataRules} ${row.examples}`.toLowerCase();
    return blob.includes(competitionCode.toLowerCase()) || /football/i.test(row.sport);
  });
  return {
    competitionCode,
    sportRuleIds: matchedSportRules.map((row) => row.id),
    matchedSportRules,
  };
}
