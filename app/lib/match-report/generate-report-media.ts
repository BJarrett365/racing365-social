import { aiChatJsonObject } from "@/app/lib/ai";
import { assembleMioPrompt } from "@/app/lib/match-report/mio/assemble-mio";
import { REPORT_HTML_SECTIONS } from "@/app/lib/match-report/mio/registry";
import { matchReportPerspectivePrompt } from "@/app/lib/match-report/match-report-format";
import { renderPlayerRatingsHtml } from "@/app/lib/match-report/player-ratings-html";
import { lintReportSections } from "@/app/lib/match-report/report-section-lint";
import { MATCH_REPORT_PLANET_SPORT_PROMPT, MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT } from "@/app/lib/prompts-catalog";
import type { MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

function plainWordCount(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

function minimumReportWords(project: MatchReportProject): number {
  if (project.reportScope !== "full") return 0;
  if (project.editorial.targetBrand === "football365") return 1200;
  if (project.editorial.targetBrand === "teamtalk") return 800;
  return 0;
}

function reportLengthInstruction(project: MatchReportProject): string {
  if (project.editorial.targetBrand === "football365") {
    return [
      "Brand-specific length requirement:",
      "- Football365 full-match editorial body must be 1,200–1,500 words across reportHtml.",
      `- reportHtml must include all ${REPORT_HTML_SECTIONS.length} Report 2.0 <h2> sections listed in OUTPUT FORMAT.`,
      "- Depth should sit in The Story, How The Match Was Won, Key Battles and What It Means — not in playerRatingsHtml or sixteenConclusionsHtml.",
      "- Expand with EIO-backed match narrative, tactics, key moments, individual performances, table stakes, interview/reaction colour and what-next context. Do not pad or invent.",
    ].join("\n");
  }
  if (project.editorial.targetBrand === "teamtalk") {
    return "Brand-specific length requirement: TEAMtalk full-match report body should be 800–1,400 words unless the brief explicitly asks for shorter copy.";
  }
  return "Brand-specific length requirement: write a complete full-match report with enough depth for the supplied EIO; do not return a short summary unless the report scope is not full-match.";
}

function scorelineInstruction(project: MatchReportProject): string {
  if (project.homeScore == null || project.awayScore == null) return "";
  return [
    "SCORELINE FORMAT (mandatory):",
    `- Tier 1 result: ${project.homeTeam} ${project.homeScore}-${project.awayScore} ${project.awayTeam}.`,
    `- Always write the score in home-away order (${project.homeScore}-${project.awayScore}), never reversed as ${project.awayScore}-${project.homeScore}.`,
    "- In standfirst and body, name both clubs when stating the result.",
  ].join("\n");
}

function styleAdherenceInstruction(project: MatchReportProject): string {
  const e = project.editorial;
  const lines = [
    "Mandatory style requirement:",
    `- Write as ${e.targetBrand} first: the website style guide in EDITORIAL_GOVERNANCE controls attitude, structure, pacing, headline/dek feel and reader promise.`,
    "- Use the Content Creator profile when present: mirror their observed paragraph rhythm, attribution habits, level of analysis, sentence length and framing without copying sample phrases.",
    "- Do not write generic AI sports copy. The article should be recognisably from the selected website and plausibly by the selected creator.",
    "- Keep all facts, scores, quotes and stats grounded in the EIO only.",
    "- No banned F365 clichés (clash, mouthwatering, set to lock horns, will be looking to, fine margins, all eyes will be on, etc.).",
  ];
  if (e.creatorName) {
    lines.push(`- Selected creator: ${e.creatorName}. Their profile should be visible in the shape and cadence of the copy.`);
  }
  return lines.join("\n");
}

function hasSixteenConclusions(html: unknown): boolean {
  if (typeof html !== "string" || !html.trim()) return false;
  const headings = html.match(/<h3[\s>]/gi) ?? [];
  return headings.length >= 16;
}

const REPORT_HTML_APPEND = `

OUTPUT FORMAT: Return JSON with keys:
headline (string)
standfirst (string)
reportHtml (HTML fragment, British English)
playerRatingsHtml (HTML table for BOTH teams when ratings exist — optional if PLAYER_INTELLIGENCE will render tables)
sixteenConclusionsHtml (HTML with exactly 16 h3 conclusions)
socialPosts (string array, 2-4 short posts)

reportHtml MUST use exactly these <h2> sections in order (Report 2.0):
${REPORT_HTML_SECTIONS.map((s) => `- ${s}`).join("\n")}

Section guidance:
- The Story: result-first hook — why this match mattered, in 2–4 paragraphs.
- Turning Point: the single moment that swung the game (goal, red card, VAR, tactical shift).
- How The Match Was Won: tactical shape, pressing, transitions, how the winner controlled phases.
- Key Battles: 2–4 duels or flank battles that decided the outcome.
- Standout Players: 3–5 performers with stats/ratings from EIO — not a full ratings table (that lives in playerRatingsHtml).
- What It Means: table impact, qualification, relegation, form narrative — stakes from league context.
- What Happens Next: next fixture, summer window hints only if in EIO, forward look for both clubs.
- Football365 Verdict: opinionated fan-first takeaway grounded in facts.

Rules:
- One <h1> for the headline only inside reportHtml.
- Each section above is a separate <h2> with supporting <p> paragraphs (and <h3> for sub-moments if needed).
- Never invent quotes, scorers, stats, injuries or timelines not in the EIO.
- Player ratings tables belong in playerRatingsHtml, not inside reportHtml sections.

Never use raw feed JSON. Facts from MIO/EIO only.`;

export async function runGenerateReportMediaJob(
  project: MatchReportProject,
  opts?: { includeSixteenConclusions?: boolean },
): Promise<MediaOutputs> {
  const includeSixteenConclusions = opts?.includeSixteenConclusions ?? true;
  const system = `${MATCH_REPORT_PLANET_SPORT_PROMPT}${includeSixteenConclusions ? `\n\n${MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT}` : ""}${REPORT_HTML_APPEND}`;
  const user = `${assembleMioPrompt(project)}

${project.eventPicture ? `EVENT_PICTURE:\n${JSON.stringify(project.eventPicture, null, 2)}` : ""}
${project.significance || project.eventPicture?.significance ? `SIGNIFICANCE:\n${JSON.stringify(project.significance ?? project.eventPicture?.significance, null, 2)}` : ""}
${project.playerIntelligence ? `PLAYER_INTELLIGENCE:\n${JSON.stringify(project.playerIntelligence, null, 2)}` : ""}
${project.layers.interviews.length ? `INTERVIEW_QUOTES:\n${project.layers.interviews.map((i) => i.digest).join("\n\n")}` : ""}

Report scope: ${project.reportScope}.
Perspective: ${matchReportPerspectivePrompt(project)}
${reportLengthInstruction(project)}
${scorelineInstruction(project)}
${styleAdherenceInstruction(project)}`;

  let usedModel = "gpt-4o-mini";
  const requestMedia = async (extraInstruction?: string): Promise<Partial<MediaOutputs>> => {
    const { data, meta } = await aiChatJsonObject<Partial<MediaOutputs>>({
      task: "premium_regeneration",
      system,
      user: extraInstruction ? `${user}\n\n${extraInstruction}` : user,
      temperature: 0.35,
      maxTokens: 10000,
      json: true,
    });
    usedModel = meta.model;
    return data;
  };

  let parsed = await requestMedia();
  const minWords = minimumReportWords(project);
  const html = String(parsed.reportHtml ?? "");
  const wordCount = plainWordCount(html);
  const lint = lintReportSections(html);
  const missingSixteen = includeSixteenConclusions && !hasSixteenConclusions(parsed.sixteenConclusionsHtml);

  if (!parsed.headline || !html || !lint.ok || (minWords > 0 && wordCount < minWords) || missingSixteen) {
    parsed = await requestMedia(
      [
        "STRICT REWRITE REQUIRED — Report 2.0 contract not met:",
        lint.missing.length ? `- Missing h2 sections: ${lint.missing.join(", ")}` : null,
        lint.notes.length ? `- ${lint.notes.join(" ")}` : null,
        minWords > 0 ? `- reportHtml word count was ${wordCount}; need ${minWords}+ words for this brand.` : null,
        missingSixteen ? "- sixteenConclusionsHtml must contain exactly 16 <h3> conclusions." : null,
        `- Include all ${REPORT_HTML_SECTIONS.length} sections in order: ${REPORT_HTML_SECTIONS.join(" → ")}.`,
        scorelineInstruction(project),
        "Keep facts grounded only in the EIO. Do not shorten. Return the same JSON keys.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (!parsed.headline || !parsed.reportHtml) {
    throw new Error("Media output missing headline or report.");
  }

  return {
    headline: String(parsed.headline),
    standfirst: String(parsed.standfirst ?? ""),
    reportHtml: String(parsed.reportHtml),
    playerRatingsHtml: parsed.playerRatingsHtml
      ? String(parsed.playerRatingsHtml)
      : project.playerIntelligence
        ? renderPlayerRatingsHtml(project.playerIntelligence, project)
        : undefined,
    sixteenConclusionsHtml: parsed.sixteenConclusionsHtml ? String(parsed.sixteenConclusionsHtml) : undefined,
    socialPosts: Array.isArray(parsed.socialPosts) ? parsed.socialPosts.map(String) : [],
    generatedAt: new Date().toISOString(),
    model: usedModel,
  };
}
