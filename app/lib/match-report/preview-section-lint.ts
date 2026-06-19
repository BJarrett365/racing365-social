import { PREVIEW_HTML_SECTIONS } from "@/app/lib/match-report/mio/registry";

export type PreviewSectionLintResult = {
  ok: boolean;
  present: string[];
  missing: string[];
  notes: string[];
};

function normaliseHeading(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const HEADING_ALIASES: Record<string, string[]> = {
  "the story": ["story"],
  "state of play": ["state of play"],
  "form guide with context": ["form guide", "form with context", "form"],
  "tactical preview": ["tactical preview", "tactics"],
  "key battles": ["key battles", "key battle"],
  "team news": ["team news"],
  "predicted lineups": ["predicted lineups", "predicted xi", "lineups", "line-ups"],
  "what could decide the match": ["what could decide", "what could decide it", "deciding factors"],
  "ai prediction": ["ai prediction", "prediction"],
  "football365 verdict": ["football365 verdict", "verdict", "f365 verdict"],
  "what happens next": ["what happens next", "what's next"],
};

export function lintPreviewSections(html: string): PreviewSectionLintResult {
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    normaliseHeading(m[1]!.replace(/<[^>]+>/g, "")),
  );
  const present: string[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  for (const required of PREVIEW_HTML_SECTIONS) {
    const aliases = HEADING_ALIASES[normaliseHeading(required)] ?? [normaliseHeading(required)];
    const found = headings.some((h) => aliases.some((a) => h.includes(a) || a.includes(h)));
    if (found) present.push(required);
    else missing.push(required);
  }

  if (!/<h1[\s>]/i.test(html)) notes.push("Missing <h1> headline.");
  if (missing.includes("What Happens Next")) {
    notes.push("What Happens Next is mandatory for tier-1 competitions.");
  }

  return {
    ok: missing.length === 0,
    present,
    missing,
    notes,
  };
}
