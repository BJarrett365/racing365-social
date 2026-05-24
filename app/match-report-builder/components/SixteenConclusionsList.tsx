"use client";

import { useMemo } from "react";
import { parseSixteenConclusionsHtml } from "@/app/lib/match-report/parse-sixteen-conclusions";

type Props = {
  html: string;
  className?: string;
};

export function SixteenConclusionsList({ html, className = "" }: Props) {
  const parsed = useMemo(() => parseSixteenConclusionsHtml(html), [html]);

  if (parsed.items.length === 0) {
    return (
      <div
        className={`prose prose-invert max-w-none text-sm text-[color:var(--text-secondary)] ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={`space-y-5 ${className}`.trim()}>
      {parsed.headline ? (
        <h4 className="text-base font-bold leading-snug text-[color:var(--text-primary)]">{parsed.headline}</h4>
      ) : null}

      {parsed.introParagraphs.length > 0 ? (
        <div className="space-y-3 border-b pb-5" style={{ borderColor: "var(--border)" }}>
          {parsed.introParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="text-sm leading-7 text-[color:var(--text-secondary)]">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      <ol className="space-y-5">
        {parsed.items.map((item) => (
          <li key={`${item.number}-${item.title}`} className="list-none">
            <p className="text-sm font-bold leading-6 text-[color:var(--text-primary)]">
              {item.number}. {item.title}
            </p>
            <div
              className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)] [&_a]:text-emerald-300 [&_a]:underline [&_strong]:font-semibold [&_strong]:text-[color:var(--text-primary)]"
              dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
