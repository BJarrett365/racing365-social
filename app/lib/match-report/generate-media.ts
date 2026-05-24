import { MATCH_REPORT_PLANET_SPORT_PROMPT, MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT } from "@/app/lib/prompts-catalog";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";
import { assembleEioPromptSections } from "@/app/lib/match-report/eio-summaries";
import { matchReportPerspectivePrompt } from "@/app/lib/match-report/match-report-format";
import { renderPlayerRatingsHtml } from "@/app/lib/match-report/player-ratings-html";
import type { MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";

const HTML_APPEND = `

OUTPUT FORMAT: Return JSON with keys:
headline (string)
standfirst (string)
reportHtml (HTML fragment, British English, h1 headline + h2 sections)
playerRatingsHtml (HTML table for BOTH teams when ratings exist)
sixteenConclusionsHtml (optional HTML with 16 h3 conclusions)
socialPosts (string array, 2-4 short posts)

Never use raw feed JSON. Facts from EIO only.`;

export async function runGenerateMediaJob(
  project: MatchReportProject,
  opts?: { includeSixteenConclusions?: boolean },
): Promise<MediaOutputs> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  if (!key) throw new Error("OpenAI API key is not configured.");
  const settings = await readStoredSettingsAsync();
  const model =
    settings.languageOpenaiModel?.trim() ||
    process.env.LANGUAGE_OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const system = `${MATCH_REPORT_PLANET_SPORT_PROMPT}${opts?.includeSixteenConclusions ? `\n\n${MATCH_SIXTEEN_CONCLUSIONS_PLANET_SPORT_PROMPT}` : ""}${HTML_APPEND}`;
  const user = `${assembleEioPromptSections(project)}

${project.eventPicture ? `EVENT_PICTURE:\n${JSON.stringify(project.eventPicture, null, 2)}` : ""}
${project.playerIntelligence ? `PLAYER_INTELLIGENCE:\n${JSON.stringify(project.playerIntelligence, null, 2)}` : ""}
${project.layers.interviews.length ? `INTERVIEW_QUOTES:\n${project.layers.interviews.map((i) => i.digest).join("\n\n")}` : ""}

Report scope: ${project.reportScope}.
Perspective: ${matchReportPerspectivePrompt(project)}
Brand voice from EDITORIAL_GOVERNANCE shapes tone only.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const body = (await res.json()) as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
  if (!res.ok) throw new Error(body.error?.message || `OpenAI HTTP ${res.status}`);
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response.");
  const parsed = JSON.parse(content) as Partial<MediaOutputs>;
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
    model,
  };
}
