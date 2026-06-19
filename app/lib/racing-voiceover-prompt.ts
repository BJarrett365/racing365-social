export type RacingVoiceStyle = "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
export type RacingDeliveryStyle = "Smooth" | "Balanced" | "Fast";
export type RacingToneStyle = "Neutral" | "Confident" | "Urgent";
export type RacingVoiceoverMode = "improve" | "regenerate" | "versions";

export type RacingVoiceoverImproveFields = {
  intro?: string;
  "tip-1"?: string;
  "tip-2"?: string;
  "tip-3"?: string;
  outro?: string;
  caption?: string;
  voiceover_script?: string;
  detail_paragraph?: string;
  league_table_standings?: string;
};

export type RacingVoiceoverImproveBody = {
  format: string;
  customPrompt: string;
  voiceStyle: RacingVoiceStyle;
  deliveryStyle: RacingDeliveryStyle;
  tone: RacingToneStyle;
  optimiseForVoiceover: boolean;
  addEmphasis: boolean;
  generateThreeVersions?: boolean;
  mode?: RacingVoiceoverMode;
  journalistProfile?: {
    id?: string;
    name?: string;
    brand?: string;
    sports?: string[];
    styleNotes?: string;
    articleGuidelines?: string;
    exampleTitles?: string[];
  };
  fields: RacingVoiceoverImproveFields;
};

export type RacingVoiceoverPromptExtras = {
  brandGuidelinesAppendix?: string;
  guardRails?: string;
  apiDefaultPrompt: string;
};

const VOICE_STYLE_GUIDANCE: Record<RacingVoiceStyle, string> = {
  Journalist:
    "Lead with the strongest verified fact. Broadcast-clean sentences, one clear narrative thread, no hype.",
  "Punchy Tips":
    "Selection-led and sharp. Mostly short sentences. Name the leader first, then the chasing pack in one tight beat. Sound like tips TV — decisive, not descriptive.",
  "Calm / Studio":
    "Measured studio read. Longer flowing phrases, composed authority, no exclamation energy. Explain the table calmly.",
  "Fast Picks":
    "High-tempo Shorts energy. Very compact clauses, almost staccato. Immediate hook, minimal filler, scene-by-scene punch.",
};

const DELIVERY_GUIDANCE: Record<RacingDeliveryStyle, string> = {
  Smooth: "Flowing spoken lines with natural breath points and connective phrasing.",
  Balanced: "Mix short punchy beats with one slightly longer context line.",
  Fast: "Compact clauses only — avoid subordinate sentences and stacked commas.",
};

const TONE_GUIDANCE: Record<RacingToneStyle, string> = {
  Neutral: "Factual and even — no editorial flourish.",
  Confident: "Authoritative and decisive — sound sure of the standings picture.",
  Urgent: "Immediate and energetic — table movement matters now, but stay factual.",
};

const VOICE_STYLE_STANDINGS_EXAMPLE: Record<RacingVoiceStyle, string> = {
  Journalist:
    'Example hook: "The USA top Group D after an opening win, three points clear on goal difference."',
  "Punchy Tips":
    'Example hook: "USA lead Group D. Three points. Plus-three goal difference. Everyone else is still on zero."',
  "Calm / Studio":
    'Example hook: "After the first round of Group D, the USA sit top with three points and a healthy goal difference."',
  "Fast Picks":
    'Example hook: "Group D. USA out front. Three points. Australia, Turkey, Paraguay — all yet to get off the mark."',
};

export function racingVoiceoverControlGuidance(
  body: Pick<RacingVoiceoverImproveBody, "voiceStyle" | "deliveryStyle" | "tone" | "optimiseForVoiceover" | "addEmphasis">,
): string[] {
  return [
    `Voice style (${body.voiceStyle}): ${VOICE_STYLE_GUIDANCE[body.voiceStyle]}`,
    `Delivery (${body.deliveryStyle}): ${DELIVERY_GUIDANCE[body.deliveryStyle]}`,
    `Tone (${body.tone}): ${TONE_GUIDANCE[body.tone]}`,
    body.optimiseForVoiceover
      ? "Voiceover craft: write for spoken rhythm, breath, scene timing and clean pronunciation."
      : "Voiceover craft: prioritise accurate editorial copy.",
    body.addEmphasis
      ? "Emphasis: make the leader, key pick or turning point land clearly in the wording — no ALL CAPS."
      : "Emphasis: keep delivery even and restrained.",
  ];
}

export function racingVoiceoverTaskInstruction(body: RacingVoiceoverImproveBody): string {
  const styleLabel = `${body.voiceStyle} · ${body.deliveryStyle} · ${body.tone}`;
  const mode = body.mode ?? (body.generateThreeVersions ? "versions" : "improve");
  const isLeagueTable = body.format === "planet-football-table" || body.format === "planet-rugby-table";
  const hasMatchResult = Boolean(body.fields.league_table_standings?.includes("=== MATCH RESULT ==="));

  if (mode === "regenerate") {
    return [
      `TASK: Regenerate the voiceover from the input fields using ${styleLabel}.`,
      "Do not reuse phrasing from voiceover_script — write a fresh script with a different hook and structure.",
      "Every fact must still match league_table_standings and scene fields.",
      ...(hasMatchResult
        ? ["Include the match score and every goal scorer listed under MATCH RESULT."]
        : []),
    ].join("\n");
  }

  if (mode === "versions") {
    return [
      `TASK: Write voiceover_script in ${styleLabel}.`,
      "Also return version_a, version_b and version_c as three clearly different rewrites:",
      "- version_a: Journalist voice, Balanced delivery, Neutral tone",
      "- version_b: Punchy Tips voice, Fast delivery, Confident tone",
      "- version_c: Fast Picks voice, Fast delivery, Urgent tone",
      "Each version must use a different opening hook and sentence rhythm while preserving the same facts.",
      ...(hasMatchResult
        ? ["Every version must include the match score and all goal scorers from MATCH RESULT when listed."]
        : []),
    ].join("\n");
  }

  return [
    `TASK: Rewrite voiceover_script for spoken delivery in ${styleLabel}.`,
    "This is NOT a light copy-edit. Rephrase every sentence so the style change is obvious when read aloud.",
    "Preserve all facts from league_table_standings and scene fields — change wording, rhythm, hook and structure only.",
    ...(isLeagueTable && hasMatchResult
      ? ["When MATCH RESULT lists scorers, name them in the script — not just the final score."]
      : []),
    "If the output reads too similar to voiceover_script, you have failed the task.",
  ].join("\n");
}

export function buildRacingVoiceoverSystemPrompt(format: string, body: RacingVoiceoverImproveBody): string {
  const base = racingVoiceoverSystemRole(format);
  const styleBlock = [
    "",
    "ACTIVE EDITORIAL CONTROLS (highest priority — override any conflicting guidance):",
    ...racingVoiceoverControlGuidance(body),
  ].join("\n");

  const standingsExample =
    format === "planet-football-table" || format === "planet-rugby-table"
      ? `\nStandings voice reference (${body.voiceStyle}): ${VOICE_STYLE_STANDINGS_EXAMPLE[body.voiceStyle]}`
      : "";

  return `${base}${styleBlock}${standingsExample}`;
}

export function buildRacingVoiceoverUserPrompt(
  body: RacingVoiceoverImproveBody,
  extras: RacingVoiceoverPromptExtras,
): string {
  const f = body.fields;
  const custom = body.customPrompt?.trim() || extras.apiDefaultPrompt;
  const profile = body.journalistProfile;
  const bg = extras.brandGuidelinesAppendix?.trim();
  const guardRails = extras.guardRails?.trim();
  const format = body.format;
  const isLeagueTable = format === "planet-football-table" || format === "planet-rugby-table";

  return [
    racingVoiceoverTaskInstruction(body),
    "",
    "=== EDITORIAL CONTROLS (must shape voiceover_script) ===",
    `voice_style: ${body.voiceStyle}`,
    `delivery_style: ${body.deliveryStyle}`,
    `tone: ${body.tone}`,
    `optimise_for_voiceover: ${body.optimiseForVoiceover ? "true" : "false"}`,
    `add_emphasis: ${body.addEmphasis ? "true" : "false"}`,
    "",
    ...racingVoiceoverControlGuidance(body),
    ...(isLeagueTable
      ? ["", `Style anchor (${body.voiceStyle}): ${VOICE_STYLE_STANDINGS_EXAMPLE[body.voiceStyle]}`]
      : []),
    "",
    "=== SUPPORTING GUIDELINES (secondary — do not override editorial controls above) ===",
    custom,
    "",
    ...(bg
      ? [
          "Brand guidelines (tone and sign-off only; do not invent facts beyond inputs):",
          bg,
          "",
        ]
      : []),
    ...(guardRails ? ["Guard rails:", guardRails, ""] : []),
    ...(profile?.name || profile?.styleNotes
      ? [
          "Selected creator profile (style guide only — do not copy phrases or invent facts):",
          `name: ${profile.name ?? ""}`,
          `brand: ${profile.brand ?? ""}`,
          `sports: ${Array.isArray(profile.sports) ? profile.sports.join(", ") : ""}`,
          `style_notes: ${profile.styleNotes ?? ""}`,
          `article_guidelines: ${profile.articleGuidelines ?? ""}`,
          `example_titles: ${Array.isArray(profile.exampleTitles) ? profile.exampleTitles.slice(0, 6).join(" | ") : ""}`,
          "",
        ]
      : []),
    "=== INPUT FIELDS ===",
    `format: ${body.format}`,
    `intro: ${f.intro ?? ""}`,
    `tip-1: ${f["tip-1"] ?? ""}`,
    `tip-2: ${f["tip-2"] ?? ""}`,
    `tip-3: ${f["tip-3"] ?? ""}`,
    `outro: ${f.outro ?? ""}`,
    `caption: ${f.caption ?? ""}`,
    `voiceover_script: ${f.voiceover_script ?? ""}`,
    ...(f.detail_paragraph?.trim()
      ? [
          "",
          "TEAMtalk News — middle scene detail paragraph (primary source for the story body):",
          f.detail_paragraph.trim(),
        ]
      : []),
    ...(f.league_table_standings?.trim()
      ? [
          "",
          "Authoritative match + standings data:",
          f.league_table_standings.trim(),
          "",
          isLeagueTable && f.league_table_standings.includes("=== MATCH RESULT ===")
            ? [
                "When MATCH RESULT includes goal scorers, voiceover_script and version_a/b/c must:",
                "- State the final score (both teams)",
                "- Name every listed goal scorer (minutes optional but encouraged)",
                "- Mention own goals as (OG) when shown",
                "- Use STANDINGS ON SCREEN for table positions only — do not invent teams or points",
              ].join("\n")
            : "Use STANDINGS ON SCREEN for team names, points and positions only.",
        ]
      : []),
    "",
    "Return JSON only with keys:",
    "voiceover_script, short_caption, version_a, version_b, version_c",
    body.mode === "versions" || body.generateThreeVersions
      ? "version_a/b/c must be three clearly different style variants as specified in TASK."
      : [
          "version_a/b/c: alternate rewrites using different voice styles (Journalist, Punchy Tips, Fast Picks).",
          "voiceover_script must match the selected editorial controls above.",
        ].join("\n"),
    "Never invent facts not in input.",
    f.league_table_standings?.trim()
      ? "Every team name in the voiceover must appear in league_table_standings."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function racingVoiceoverSystemRole(format: string): string {
  if (format === "teamtalk-news") {
    return "You are a UK sports news script editor (TEAMtalk-style football transfer and club news). Base the voiceover on the headline fields and especially the detail paragraph when provided. Keep scripts factual, natural, spoken, and concise — do not invent quotes or sources beyond the copy supplied.";
  }
  if (format === "planet-football-table" || format === "planet-rugby-table") {
    return "You are a UK football/rugby standings script editor. The league_table_standings block is authoritative. When it includes a MATCH RESULT section with goal scorers, you must weave the scoreline and all named scorers into the voiceover. Use STANDINGS ON SCREEN for table positions. Never contradict either section or mention teams not listed.";
  }
  return "You are a UK racing journalist script editor. Keep scripts factual, natural, spoken, and concise.";
}

export function racingVoiceoverTemperature(body: RacingVoiceoverImproveBody): number {
  const mode = body.mode ?? (body.generateThreeVersions ? "versions" : "improve");
  if (mode === "versions") return 0.85;
  if (mode === "regenerate") return 0.8;
  return 0.7;
}
