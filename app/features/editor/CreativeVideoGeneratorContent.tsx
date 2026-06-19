"use client";

import { useState } from "react";
import { R365Button } from "@/app/components/R365Button";
import {
  type CreativeVideoGeneratorVariant,
  creativeVideoGeneratorTemplateForVariant,
} from "@/app/lib/creative-video-generator-template";

type Props = {
  variant?: CreativeVideoGeneratorVariant;
};

/** Creative briefing template (copy-paste for Runway). Used under Scene subtitles & timing in the template editor. */
export function CreativeVideoGeneratorContent({ variant = "default" }: Props) {
  const template = creativeVideoGeneratorTemplateForVariant(variant);
  const isWorldCupFootball = variant === "world-cup-football";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-slate-200">Creative video generator</p>
      <p className="mt-2 text-sm text-slate-400">
        {isWorldCupFootball ? (
          <>
            World Cup football table brief for Runway (or any video tool). Replace{" "}
            <code className="text-slate-500">[INSERT SCENE HERE]</code> and{" "}
            <code className="text-slate-500">[INSERT MOOD]</code> — e.g. stadium atmosphere for the group on screen.
            No logos or on-screen text in the render; tables and score lines stay in your editor.
          </>
        ) : (
          <>
            Paste into Runway (or any video tool) after replacing{" "}
            <code className="text-slate-500">[INSERT SCENE HERE]</code> and{" "}
            <code className="text-slate-500">[INSERT MOOD]</code>. No logos or on-screen text in the render—subtitles stay in
            your editor.
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <R365Button variant="ghost" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy template"}
        </R365Button>
        {copied && <span className="text-xs text-[#22c55e]">Clipboard updated.</span>}
      </div>
      <pre className="mt-4 max-h-[min(520px,70vh)] overflow-auto rounded-lg border border-[#1f2d26] bg-[#0f1512] p-4 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">
        {template}
      </pre>
    </div>
  );
}
