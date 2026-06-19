/** ISO 3166-1 alpha-2 codes for national teams (World Cup / internationals). */
const NATIONAL_TEAM_ISO: Record<string, string> = {
  usa: "us",
  "united states": "us",
  paraguay: "py",
  australia: "au",
  turkey: "tr",
  turkiye: "tr",
  england: "gb-eng",
  scotland: "gb-sct",
  wales: "gb-wls",
  "northern ireland": "gb-nir",
  brazil: "br",
  argentina: "ar",
  algeria: "dz",
  france: "fr",
  germany: "de",
  spain: "es",
  italy: "it",
  portugal: "pt",
  netherlands: "nl",
  belgium: "be",
  croatia: "hr",
  mexico: "mx",
  canada: "ca",
  japan: "jp",
  "south korea": "kr",
  korea: "kr",
  "saudi arabia": "sa",
  qatar: "qa",
  iran: "ir",
  morocco: "ma",
  senegal: "sn",
  ghana: "gh",
  nigeria: "ng",
  "cape verde": "cv",
  "cabo verde": "cv",
  "south africa": "za",
  uruguay: "uy",
  chile: "cl",
  colombia: "co",
  ecuador: "ec",
  peru: "pe",
  costa: "cr",
  "costa rica": "cr",
  panama: "pa",
  jamaica: "jm",
  switzerland: "ch",
  austria: "at",
  poland: "pl",
  ukraine: "ua",
  serbia: "rs",
  denmark: "dk",
  sweden: "se",
  norway: "no",
  finland: "fi",
  iceland: "is",
  "czech republic": "cz",
  czechia: "cz",
  hungary: "hu",
  romania: "ro",
  greece: "gr",
  ireland: "ie",
  "republic of ireland": "ie",
  china: "cn",
  india: "in",
};

function teamKey(team: string): string {
  return team.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Flag-style crest for international sides (used on Sport365 score lines). */
export function nationalTeamCrestUrl(team: string): string | undefined {
  const iso = NATIONAL_TEAM_ISO[teamKey(team)];
  if (!iso) return undefined;
  return `https://flagcdn.com/w160/${iso}.png`;
}

export function nationalTeamInitials(team: string): string {
  const parts = team.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
