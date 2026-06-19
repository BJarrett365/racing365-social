"use client";

import Link from "next/link";
import {
  TemplateNewButton,
  type TeamLineUpNewDefaults,
  type TeamSheetNewDefaults,
  type TemplateFormatKey,
} from "@/app/components/TemplateNewButton";

/** Hub card footer: primary New template + secondary Open list link. */
export function HubPipelineActions({
  format,
  listPath,
  editorBasePath = "/editor",
  teamLineUpDefaults,
  teamSheetDefaults,
}: {
  format: TemplateFormatKey;
  listPath: string;
  editorBasePath?: "/editor" | "/landscape/editor";
  teamLineUpDefaults?: TeamLineUpNewDefaults;
  teamSheetDefaults?: TeamSheetNewDefaults;
}) {
  return (
    <div className="flex flex-col items-start gap-2 pt-2">
      <TemplateNewButton
        format={format}
        editorBasePath={editorBasePath}
        teamLineUpDefaults={teamLineUpDefaults}
        teamSheetDefaults={teamSheetDefaults}
      />
      <Link href={listPath} className="ds-link-accent inline-flex text-sm">
        Open list →
      </Link>
    </div>
  );
}
