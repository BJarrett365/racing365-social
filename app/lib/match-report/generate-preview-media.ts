import { aiChatJsonObject } from "@/app/lib/ai";
import { assembleMioPrompt } from "@/app/lib/match-report/mio/assemble-mio";
import { PREVIEW_HTML_SECTIONS } from "@/app/lib/match-report/mio/registry";
import { lintPreviewSections } from "@/app/lib/match-report/preview-section-lint";
import { MATCH_PREVIEW_PLANET_SPORT_PROMPT } from "@/app/lib/prompts-catalog";
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

function minimumPreviewWords(project: MatchReportProject): number {
  if (project.editorial.targetBrand === "football365") return 700;
  if (project.editorial.targetBrand === "teamtalk") return 550;
  return 500;
}

function previewLengthInstruction(project: MatchReportProject): string {
  const min = minimumPreviewWords(project);
  if (project.editorial.targetBrand === "football365") {
    return [
      "Brand-specific length requirement:",
      `- Football365 preview body must be ${min}–1,100 words across reportHtml.`,
      `- Depth in The Story, Form Guide With Context, Tactical Preview, Key Battles and What It Means — not thin section stubs.`,
      `- Include all ${PREVIEW_HTML_SECTIONS.length} h2 sections with multiple paragraphs each where the MIO supports it.`,
    ].join("\n");
  }
  return `Target ${min}+ words for the full preview body unless the brief explicitly asks for shorter copy.`;
}

function kickoffInstruction(project: MatchReportProject): string {
  const kickoff = project.layers.sixLogic?.facts.kickoffIso?.trim();
  if (!kickoff) return "";
  return [
    "KICKOFF CONTEXT (mandatory):",
    `- Kickoff: ${kickoff}.`,
    "- State the date and kickoff time in the standfirst or The Story.",
    "- Use pre-match framing only — this is a preview, not a report of a finished match.",
  ].join("\n");
}

const PREVIEW_HTML_APPEND = `

OUTPUT FORMAT: Return JSON with keys:
headline (string)
standfirst (string)
reportHtml (HTML fragment, British English)

reportHtml MUST use exactly these <h2> sections in order:
${PREVIEW_HTML_SECTIONS.map((s) => `- ${s}`).join("\n")}

Rules:
- One <h1> for the headline only.
- Each section above is a separate <h2> with supporting <p> paragraphs.
- Never invent team news, injuries, line-ups or odds not in MIO / Preview Picture.
- AI Prediction: only if odds or model data supplied in source — otherwise write "No firm prediction" with reason.
- Football365 Verdict: opinionated fan-first takeaway grounded in facts.
- What Happens Next: mandatory — table impact, next fixture, qualification stakes.
- Target 700–1,100 words for standard PL fixtures.
- No banned F365 clichés (clash, mouthwatering, set to lock horns, etc.).
- socialPosts (string array, 2–3 short posts) optional in JSON.`;

export async function runGeneratePreviewMediaJob(project: MatchReportProject): Promise<MediaOutputs> {
  const system = `${MATCH_PREVIEW_PLANET_SPORT_PROMPT}${PREVIEW_HTML_APPEND}`;
  const user = `${assembleMioPrompt(project)}

${project.previewPicture ? `PREVIEW_PICTURE:\n${JSON.stringify(project.previewPicture, null, 2)}` : ""}
${project.teamIntelligence ? `TEAM_INTELLIGENCE:\n${project.teamIntelligence.digest}` : ""}
${project.significance || project.previewPicture?.significance ? `SIGNIFICANCE:\n${JSON.stringify(project.significance ?? project.previewPicture?.significance, null, 2)}` : ""}

Perspective: neutral Football365 preview. Explain why this match matters — not only what might happen.
${previewLengthInstruction(project)}
${kickoffInstruction(project)}`;

  const requestPreview = async (extraInstruction?: string): Promise<Partial<MediaOutputs>> => {
    const { data, meta } = await aiChatJsonObject<Partial<MediaOutputs> & { socialPosts?: string[] }>({
      task: "preview_analysis",
      system,
      user: extraInstruction ? `${user}\n\n${extraInstruction}` : user,
      temperature: 0.38,
      maxTokens: 9000,
      json: true,
    });
    return { ...data, model: meta.model };
  };

  let parsed = await requestPreview();
  const minWords = minimumPreviewWords(project);
  let html = String(parsed.reportHtml ?? "");
  let lint = lintPreviewSections(html);
  let wordCount = plainWordCount(html);

  if (!lint.ok || !parsed.headline || !html || (minWords > 0 && wordCount < minWords)) {
    parsed = await requestPreview(
      [
        "STRICT REWRITE REQUIRED — preview contract not met:",
        lint.missing.length ? `- Missing h2 sections: ${lint.missing.join(", ")}` : null,
        lint.notes.length ? `- ${lint.notes.join(" ")}` : null,
        minWords > 0 ? `- reportHtml word count was ${wordCount}; need ${minWords}+ words for this brand.` : null,
        `- Include all ${PREVIEW_HTML_SECTIONS.length} sections in order: ${PREVIEW_HTML_SECTIONS.join(" → ")}.`,
        kickoffInstruction(project),
        "Expand Form Guide, Tactical Preview, Key Battles and Verdict using MIO facts only. Do not shorten. Return the same JSON keys.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    html = String(parsed.reportHtml ?? "");
    lint = lintPreviewSections(html);
    wordCount = plainWordCount(html);
  }

  if (!parsed.headline || !parsed.reportHtml) {
    throw new Error("Preview output missing headline or reportHtml.");
  }

  return {
    headline: String(parsed.headline),
    standfirst: String(parsed.standfirst ?? ""),
    reportHtml: String(parsed.reportHtml),
    socialPosts: Array.isArray(parsed.socialPosts) ? parsed.socialPosts.map(String) : [],
    generatedAt: new Date().toISOString(),
    model: typeof parsed.model === "string" ? parsed.model : undefined,
  };
}
