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
    return { title: `Editor | ${BRAND_SUITE}` };
  }
  const seo = await getEditorSeo(type as EditorType, id);
  return {
    title: seo.pageTitle,
    description: seo.description,
    openGraph: {
      title: seo.pageTitle,
      description: seo.description,
    },
  };
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!allowed.has(type)) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-red-200">
        Unknown editor type. Use <code>next-off</code>, <code>fast-results</code>,{" "}
        <code>racecard</code>, <code>football-lineups</code>, <code>teamtalk-news</code>,{" "}
        <code>f1-grid</code>, <code>f1-results</code>, <code>planet-football-table</code>, <code>planet-rugby-table</code>, <code>team-line-up</code>, <code>team-sheet</code>, or <code>score-line</code>.
        <div className="mt-4">
          <Link href="/" className="text-[#22c55e] hover:underline">
            Back home
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Editor</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{seo.headline}</h1>
          <p className="mt-1 text-sm capitalize text-[color:var(--text-muted)]">
            {type.replace(/-/g, " ")} · <span className="font-mono text-[#eab308]">{id}</span>
          </p>
        </div>
        <Link
          href={
            type === "next-off"
              ? "/next-off"
              : type === "fast-results"
                ? "/results"
                : type === "football-lineups"
                  ? "/football-lineups"
                  : type === "teamtalk-news"
                    ? "/teamtalk-news"
                    : type === "f1-grid"
                      ? "/f1-grid"
                      : type === "f1-results"
                        ? "/f1-results"
                        : type === "planet-football-table"
                          ? "/planet-football-table"
                          : type === "planet-rugby-table"
                            ? "/planet-rugby-table"
                            : type === "team-line-up"
                              ? "/team-line-up"
                              : type === "team-sheet"
                                ? "/team-sheet"
                                : type === "score-line"
                                  ? "/score-line"
                                  : "/racecards"
          }
          className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          ← Back to list
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
      />
    </div>
  );
}
