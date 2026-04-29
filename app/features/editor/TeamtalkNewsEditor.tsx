"use client";

import type { Dispatch, SetStateAction } from "react";
import { applyTemplateWithPreferences } from "@/app/features/content/content-generator";
import { EditorCollapsible } from "@/app/features/editor/EditorCollapsible";
import type { GeneratedContent, TeamtalkNewsBundle, TemplateSource } from "@/types";

const input =
  "w-full rounded-lg border border-[#1f2d26] bg-[#0a0e0c] px-2 py-1.5 text-sm text-white";
const label = "block text-[10px] font-semibold uppercase tracking-wide text-slate-500";

type Props = {
  bundle: TeamtalkNewsBundle;
  content: GeneratedContent;
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>;
  onAfterTemplateCommit?: () => void;
  templateSectionUnstyled?: boolean;
};

function commit(
  setContent: Dispatch<SetStateAction<GeneratedContent | null>>,
  prev: GeneratedContent | null,
  bundle: TeamtalkNewsBundle,
  onAfter?: () => void,
) {
  const source: TemplateSource = { format: "teamtalk-news", bundle };
  setContent(applyTemplateWithPreferences(prev, source));
  onAfter?.();
}

export function TeamtalkNewsEditor({
  bundle,
  content,
  setContent,
  onAfterTemplateCommit,
  templateSectionUnstyled = false,
}: Props) {
  const push = (next: TeamtalkNewsBundle) => {
    commit(setContent, content, next, onAfterTemplateCommit);
  };

  const lines = [...bundle.headlineLines];
  while (lines.length < 4) lines.push("");
  const slots = lines.slice(0, 4);

  const setLine = (i: number, v: string) => {
    const next = [...slots];
    next[i] = v;
    push({ ...bundle, headlineLines: next });
  };

  return (
    <EditorCollapsible title="Template data — TEAMtalk News" unstyled={templateSectionUnstyled}>
      {bundle.sourceUrl && (
        <p className="mb-3 text-xs">
          <a
            href={bundle.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#22c55e] hover:underline"
          >
            Open original article on TEAMtalk →
          </a>
          {bundle.feedStoryId != null && (
            <span className="ml-2 text-slate-500">Story #{bundle.feedStoryId}</span>
          )}
        </p>
      )}
      <p className="mb-3 text-xs text-amber-200/90">
        9:16 transfer-news style: neon headline bars, optional player + club logos. Use{" "}
        <strong className="text-[#eab308]">Render scenes</strong> after edits. Image URLs can be https or{" "}
        <code className="text-slate-500">data:image/…</code>.
      </p>
      <div className="space-y-3">
        <label className={label}>
          Tag / kicker
          <input
            className={`${input} mt-1`}
            value={bundle.tag}
            onChange={(e) => push({ ...bundle, tag: e.target.value })}
            placeholder="EXCLUSIVE"
          />
        </label>
        <p className={`${label}`}>Headline lines (neon bars, main scene)</p>
        {slots.map((line, i) => (
          <label key={i} className={label}>
            Line {i + 1}
            <input
              className={`${input} mt-1`}
              value={line}
              onChange={(e) => setLine(i, e.target.value)}
              placeholder="ALL CAPS HEADLINE FRAGMENT"
            />
          </label>
        ))}
        <label className={label}>
          Player name (voiceover + main scene)
          <input
            className={`${input} mt-1`}
            value={bundle.playerName ?? ""}
            onChange={(e) => push({ ...bundle, playerName: e.target.value })}
          />
        </label>
        <label className={label}>
          Player image URL
          <input
            className={`${input} mt-1 font-mono text-xs`}
            value={bundle.playerImageUrl ?? ""}
            onChange={(e) => push({ ...bundle, playerImageUrl: e.target.value })}
            placeholder="https://…"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={label}>
            Left club logo URL
            <input
              className={`${input} mt-1 font-mono text-xs`}
              value={bundle.leftClubLogoUrl ?? ""}
              onChange={(e) => push({ ...bundle, leftClubLogoUrl: e.target.value })}
            />
          </label>
          <label className={label}>
            Right club logo URL
            <input
              className={`${input} mt-1 font-mono text-xs`}
              value={bundle.rightClubLogoUrl ?? ""}
              onChange={(e) => push({ ...bundle, rightClubLogoUrl: e.target.value })}
            />
          </label>
        </div>
        <label className={`${label} block`}>
          Detail paragraph (middle scene)
          <textarea
            className={`${input} mt-1 min-h-[72px]`}
            value={bundle.secondaryParagraph ?? ""}
            onChange={(e) => push({ ...bundle, secondaryParagraph: e.target.value })}
          />
        </label>
        <label className={label}>
          Footer / link CTA (white bar)
          <input
            className={`${input} mt-1`}
            value={bundle.linkCta}
            onChange={(e) => push({ ...bundle, linkCta: e.target.value })}
            placeholder="LINK IN FIRST COMMENT"
          />
        </label>
        <label className={label}>
          Outro line (voice + last scene)
          <input
            className={`${input} mt-1`}
            value={bundle.outroLine ?? ""}
            onChange={(e) => push({ ...bundle, outroLine: e.target.value })}
          />
        </label>
      </div>
    </EditorCollapsible>
  );
}
