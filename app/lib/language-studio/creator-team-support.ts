import type { LanguageJournalistProfile } from "@/app/lib/language-studio/types";

export type CreatorTeamSupportMode = "neutral" | "club";

export type CreatorTeamSupportFields = Pick<LanguageJournalistProfile, "teamSupportMode" | "supportedClub">;

export function creatorTeamSupportMode(profile: CreatorTeamSupportFields): CreatorTeamSupportMode {
  if (profile.teamSupportMode === "club" && profile.supportedClub?.trim()) return "club";
  return "neutral";
}

export function creatorTeamSupportLabel(profile: CreatorTeamSupportFields): string {
  if (creatorTeamSupportMode(profile) === "club") {
    return `Supports ${profile.supportedClub!.trim()}`;
  }
  return "Neutral";
}

export function creatorTeamSupportPrompt(
  profile: CreatorTeamSupportFields,
  match?: { homeTeam: string; awayTeam: string },
): string {
  if (creatorTeamSupportMode(profile) !== "club") {
    return "Creator team support: Neutral — balanced match reporting with no club allegiance.";
  }
  const club = profile.supportedClub!.trim();
  let prompt = `Creator team support: ${club}. Lean into ${club} angles, quotes, and narrative when factually appropriate.`;
  if (match) {
    const normalize = (team: string) =>
      team
        .toLowerCase()
        .replace(/\bfc\b/g, "")
        .replace(/[^a-z0-9]/g, "");
    const clubKey = normalize(club);
    const homeKey = normalize(match.homeTeam);
    const awayKey = normalize(match.awayTeam);
    const isHome = homeKey.includes(clubKey) || clubKey.includes(homeKey);
    const isAway = awayKey.includes(clubKey) || clubKey.includes(awayKey);
    if (isHome) prompt += ` ${club} are the home team in this fixture.`;
    else if (isAway) prompt += ` ${club} are the away team in this fixture.`;
    else prompt += ` This fixture does not involve ${club} — keep reporting balanced on the match itself.`;
  }
  return prompt;
}
