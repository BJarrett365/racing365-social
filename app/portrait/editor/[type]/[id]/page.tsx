import type { Metadata } from "next";
import Link from "next/link";
import { EditorWorkspace } from "@/app/features/editor/EditorWorkspace";
import { getEditorSeo, type EditorType } from "@/app/lib/editor-seo";
import { BRAND_SUITE } from "@/app/lib/brand";

const allowed = new Set([
  "next-off",
  "fast-results",
  "racecard",
  "football-lineups",
  "teamtalk-news",
  "f1-grid",
  "f1-results",
  "planet-football-table",
  "planet-rugby-table",
  "team-line-up",
  "team-sheet",
  "score-line",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type, id } = await params;
  if (!allowed.has(type)) {
    return { title: `Landscape Editor | ${BRAND_SUITE}` };
  }
  const seo = await getEditorSeo(type as EditorType, id);
  return {
    title: `Landscape · ${seo.pageTitle}`,
    description: seo.description,
    openGraph: {
      title: `Landscape · ${seo.pageTitle}`,
      description: seo.description,
    },
  };
}

export default async function LandscapeEditorPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!allowed.has(type)) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-red-200">
        Unknown editor type.
        <div className="mt-4">
          <Link href="/landscape" className="text-[#22c55e] hover:underline">
            Back to landscape hub
          </Link>
        </div>
      </div>
    );
  }

  const seo = await getEditorSeo(type as EditorType, id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Landscape Editor</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{seo.headline}</h1>
          <p className="mt-1 text-sm capitalize text-[color:var(--text-muted)]">
            {type.replace(/-/g, " ")} · <span className="font-mono text-[#eab308]">{id}</span>
          </p>
        </div>
        <Link
          href="/landscape"
          className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          ← Back to landscape hub
        </Link>
      </div>
      <EditorWorkspace
        type={
          type as
            | "next-off"
            | "fast-results"
            | "racecard"
            | "football-lineups"
            | "teamtalk-news"
            | "f1-grid"
            | "f1-results"
            | "planet-football-table"
            | "planet-rugby-table"
            | "team-line-up"
            | "team-sheet"
            | "score-line"
        }
        id={id}
        initialVideoBuildMode="landscape"
        lockVideoBuildMode
      />
    </div>
  );
}
