import { REPORT_HTML_SECTIONS } from "@/app/lib/match-report/mio/registry";
import type { EditorialSectionLintResult } from "@/app/lib/match-report/mio/types";

function normaliseHeading(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const HEADING_ALIASES: Record<string, string[]> = {
  "the story": ["story", "match summary"],
  "turning point": ["turning point", "key moment", "key moments"],
  "how the match was won": [
    "how the match was won",
    "tactical analysis",
    "tactics",
    "how it was won",
  ],
  "key battles": ["key battles", "key battle"],
  "standout players": ["standout players", "player ratings", "man of the match", "performers"],
  "what it means": ["what it means", "what this means", "extended report"],
  "what happens next": ["what happens next", "what's next", "what next"],
  "football365 verdict": ["football365 verdict", "verdict", "f365 verdict"],
};

export function lintReportSections(html: string): EditorialSectionLintResult {
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
    normaliseHeading(m[1]!.replace(/<[^>]+>/g, "")),
  );
  const present: string[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  for (const required of REPORT_HTML_SECTIONS) {
    const aliases = HEADING_ALIASES[normaliseHeading(required)] ?? [normaliseHeading(required)];
    const found = headings.some((h) => aliases.some((a) => h.includes(a) || a.includes(h)));
    if (found) present.push(required);
    else missing.push(required);
  }

  if (!/<h1[\s>]/i.test(html)) notes.push("Missing <h1> headline.");
  if (missing.includes("What Happens Next")) {
    notes.push("What Happens Next is mandatory for post-match reports.");
  }
  if (missing.length > 0 && present.length < 3) {
    notes.push("Report appears to use the legacy Match Analysis / Extended Report template — regenerate with Report 2.0 sections.");
  }

  return { ok: missing.length === 0, present, missing, notes };
}
