/**
 * Brand-aware tone hints for Editing Studio AI prompts (expand per tenant).
 */
export function brandVoiceBlock(brand: string | undefined): string {
  const b = brand?.trim();
  if (!b) {
    return "Brand: not specified — use a professional editorial sports tone.";
  }
  const lower = b.toLowerCase();
  if (lower.includes("football365") || (lower.includes("football") && lower.includes("365"))) {
    return `Brand: ${b}. Voice: confident football editorial; UK English; avoid clickbait; facts-first.`;
  }
  if (lower.includes("racing365") || (lower.includes("racing") && lower.includes("365"))) {
    return `Brand: ${b}. Voice: motorsport editorial; precise; UK English; respect for drivers/teams.`;
  }
  if (lower.includes("planet sport") || lower.includes("planetsport")) {
    return `Brand: ${b}. Voice: broad sports network; inclusive; clear; UK English.`;
  }
  if (lower.includes("teamtalk")) {
    return `Brand: ${b}. Voice: fan-forward football; conversational but credible.`;
  }
  return `Brand: ${b}. Voice: professional sports editorial; clear; audience-first.`;
}

export function buildContextBlock(params: {
  title?: string;
  summary?: string;
  brand?: string;
}): string {
  const lines: string[] = [];
  if (params.title?.trim()) lines.push(`Project title: ${params.title.trim()}`);
  if (params.summary?.trim()) lines.push(`Summary: ${params.summary.trim().slice(0, 4000)}`);
  lines.push(brandVoiceBlock(params.brand));
  return lines.join("\n");
}
