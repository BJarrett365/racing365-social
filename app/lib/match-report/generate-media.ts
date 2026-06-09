import { aiChatJsonObject } from "@/app/lib/ai";
import { MATCH_REPORT_PLANET_SPORT_PROMPT, MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT } from "@/app/lib/prompts-catalog";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import { matchReportPerspectivePrompt } from "@/app/lib/match-report/match-report-format";
import { renderPlayerRatingsHtml } from "@/app/lib/match-report/player-ratings-html";
import type { MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

const HTML_APPEND = `

OUTPUT FORMAT: Return JSON with keys:
headline (string)
standfirst (string)
reportHtml (HTML fragment, British English, h1 headline + h2 sections; MUST include h2 "Match Analysis" and h2 "Extended Report")
playerRatingsHtml (HTML table for BOTH teams when ratings exist)
sixteenConclusionsHtml (HTML with exactly 16 h3 conclusions)
socialPosts (string array, 2-4 short posts)

Never use raw feed JSON. Facts from EIO only.`;

function reportLengthInstruction(project: MatchReportProject): string {
  if (project.editorial.targetBrand === "football365") {
    return [
      "Brand-specific length requirement:",
      "- Football365 full-match editorial body must be 1,200–1,500 words across reportHtml.",
      "- reportHtml must include two visible editorial sections: <h2>Match Analysis</h2> and <h2>Extended Report</h2>.",
      "- Match Analysis plus Extended Report together must total 1,200–1,500 words.",
      "- This word count excludes playerRatingsHtml and sixteenConclusionsHtml.",
      "- Expand with EIO-backed match narrative, tactics, key moments, individual performances, table stakes, interview/reaction colour and what-next context. Do not pad or invent.",
    ].join("\n");
  }
  if (project.editorial.targetBrand === "teamtalk") {
    return "Brand-specific length requirement: TEAMtalk full-match report body should be 800–1,400 words unless the brief explicitly asks for shorter copy.";
  }
  return "Brand-specific length requirement: write a complete full-match report with enough depth for the supplied EIO; do not return a short summary unless the report scope is not full-match.";
}

function styleAdherenceInstruction(project: MatchReportProject): string {
  const e = project.editorial;
  const lines = [
    "Mandatory style requirement:",
    `- Write as ${e.targetBrand} first: the website style guide in EDITORIAL_GOVERNANCE controls attitude, structure, pacing, headline/dek feel and reader promise.`,
    "- Use the Content Creator profile when present: mirror their observed paragraph rhythm, attribution habits, level of analysis, sentence length and framing without copying sample phrases.",
    "- Do not write generic AI sports copy. The article should be recognisably from the selected website and plausibly by the selected creator.",
    "- Keep all facts, scores, quotes and stats grounded in the EIO only.",
  ];
  if (e.creatorName) {
    lines.push(`- Selected creator: ${e.creatorName}. Their profile should be visible in the shape and cadence of the copy.`);
  }
  return lines.join("\n");
}

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

function needsRequiredFootball365Sections(project: MatchReportProject, html: string): boolean {
  if (project.editorial.targetBrand !== "football365" || project.reportScope !== "full") return false;
  return !/<h2[^>]*>\s*Match Analysis\s*<\/h2>/i.test(html) || !/<h2[^>]*>\s*Extended Report\s*<\/h2>/i.test(html);
}

function hasSixteenConclusions(html: unknown): boolean {
  if (typeof html !== "string" || !html.trim()) return false;
  const headings = html.match(/<h3[\s>]/gi) ?? [];
  return headings.length >= 16;
}

export async function runGenerateMediaJob(
  project: MatchReportProject,
  opts?: { includeSixteenConclusions?: boolean },
): Promise<MediaOutputs> {
  const includeSixteenConclusions = opts?.includeSixteenConclusions ?? true;
  const system = `${MATCH_REPORT_PLANET_SPORT_PROMPT}${includeSixteenConclusions ? `\n\n${MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT}` : ""}${HTML_APPEND}`;
  const user = `${assembleEioPromptSections(project)}

${project.eventPicture ? `EVENT_PICTURE:\n${JSON.stringify(project.eventPicture, null, 2)}` : ""}
${project.playerIntelligence ? `PLAYER_INTELLIGENCE:\n${JSON.stringify(project.playerIntelligence, null, 2)}` : ""}
${project.layers.interviews.length ? `INTERVIEW_QUOTES:\n${project.layers.interviews.map((i) => i.digest).join("\n\n")}` : ""}

Report scope: ${project.reportScope}.
Perspective: ${matchReportPerspectivePrompt(project)}
${reportLengthInstruction(project)}
${styleAdherenceInstruction(project)}`;

  let usedModel = "gpt-4o-mini";
  const requestMedia = async (userPrompt: string): Promise<Partial<MediaOutputs>> => {
    const { data, meta } = await aiChatJsonObject<Partial<MediaOutputs>>({
      task: "premium_regeneration",
      system,
      user: userPrompt,
      temperature: 0.35,
      maxTokens: 10000,
      json: true,
    });
    usedModel = meta.model;
    return data;
  };

  let parsed = await requestMedia(user);
  const minWords = minimumReportWords(project);
  const firstWordCount = parsed.reportHtml ? plainWordCount(String(parsed.reportHtml)) : 0;
  const firstHtml = parsed.reportHtml ? String(parsed.reportHtml) : "";
  const missingSections = needsRequiredFootball365Sections(project, firstHtml);
  const missingSixteen = includeSixteenConclusions && !hasSixteenConclusions(parsed.sixteenConclusionsHtml);
  if (minWords > 0 && (firstWordCount < minWords || missingSections || missingSixteen)) {
    parsed = await requestMedia(`${user}

STRICT REWRITE REQUIRED:
The previous output did not meet the publishing contract:
- reportHtml word count was ${firstWordCount}; it must be 1,200–1,500 words for Football365 full-match output.
- reportHtml must include <h2>Match Analysis</h2> and <h2>Extended Report</h2>.
- Match Analysis plus Extended Report are the main editorial body and must carry the depth, not playerRatingsHtml or sixteenConclusionsHtml.
- sixteenConclusionsHtml is required and must contain exactly 16 numbered <h3> conclusions.
Keep facts grounded only in the EIO. Add useful EIO-backed detail: match narrative, goals and key incidents, tactical pattern, player performances across both teams, table/relegation context, imported interview/reaction colour when supplied, and what next.
You must preserve the website style and selected Content Creator style from EDITORIAL_GOVERNANCE; do not rewrite into generic neutral sports copy.
Return the same JSON keys. Do not shorten the article. Do not move the body copy into sixteenConclusionsHtml.`);
  }
  if (!parsed.headline || !parsed.reportHtml) throw new Error("Media output missing headline or report.");

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
