"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import { editorialBriefChip } from "@/app/lib/match-report/editorial-governance";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import { HeroPreviewGrid } from "@/app/match-report-builder/components/HeroPreviewGrid";
import { MatchReportOutputPreview } from "@/app/match-report-builder/components/MatchReportOutputPreview";
import { SixteenConclusionsList } from "@/app/match-report-builder/components/SixteenConclusionsList";
import { PlayerRatingsTable } from "@/app/match-report-builder/components/PlayerRatingsTable";
import { MatchReportDistributionPanel } from "@/app/match-report-builder/components/MatchReportDistributionPanel";
import { SkippedLayersReport } from "@/app/match-report-builder/components/SkippedLayersReport";
import { WorldCupStandingsRefresh } from "@/app/match-report-builder/components/WorldCupStandingsRefresh";

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]";

type Props = {
  project: MatchReportProject;
  onProjectChange: (project: MatchReportProject) => void;
  onBack: () => void;
  busy?: boolean;
  error?: string | null;
};

export function ReviewScreen({ project, onProjectChange, onBack, busy, error }: Props) {
  const media = project.mediaOutputs;
  const [headline, setHeadline] = useState(media?.headline ?? "");
  const [standfirst, setStandfirst] = useState(media?.standfirst ?? "");
  const [reportHtml, setReportHtml] = useState(media?.reportHtml ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(project.archive?.languageStudioUrl ?? null);
  const [rewriteUrl, setRewriteUrl] = useState<string | null>(
    project.archive?.languageStudioUrl ??
      (project.archive?.languageStudioArticleId
        ? withAppPathPrefix(
            `/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(project.archive.languageStudioArticleId)}`,
          )
        : null),
  );
  const [reviewPanel, setReviewPanel] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    if (!media) return;
    setHeadline(media.headline);
    setStandfirst(media.standfirst);
    setReportHtml(media.reportHtml);
  }, [media?.headline, media?.reportHtml, media?.standfirst]);

  useEffect(() => {
    if (project.archive?.languageStudioUrl) {
      setRewriteUrl(project.archive.languageStudioUrl);
      return;
    }
    if (project.archive?.languageStudioArticleId) {
      setRewriteUrl(
        withAppPathPrefix(
          `/language-studio?tab=${encodeURIComponent("Rewrite")}&articleId=${encodeURIComponent(project.archive.languageStudioArticleId)}`,
        ),
      );
    }
  }, [project.archive?.languageStudioArticleId, project.archive?.languageStudioUrl]);

  if (!media) return null;

  const saveEdits = async () => {
    setLocalError(null);
    const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaOutputs: { headline, standfirst, reportHtml },
      }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Save failed");
    onProjectChange(data.project);
    if (data.project.archive?.languageStudioArticleId) {
      const syncRes = await fetch(studioApiPath("/api/match-report/sync-language-studio"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const syncData = (await syncRes.json()) as { rewriteUrl?: string; project?: MatchReportProject; error?: string };
      if (syncRes.ok) {
        if (syncData.rewriteUrl) setRewriteUrl(syncData.rewriteUrl);
        if (syncData.project) onProjectChange(syncData.project);
      }
    }
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <WorldCupStandingsRefresh project={project} onProjectChange={onProjectChange} compact />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Review</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Confidence {project.confidence}% · {editorialBriefChip(project.editorial)}
          </p>
        </div>

        {rewriteUrl ? (
          <div
            className="rounded-2xl border px-4 py-3"
            style={{ borderColor: "rgba(52,211,153,0.25)", background: "rgba(16,185,129,0.06)" }}
          >
            <p className="text-xs text-[color:var(--text-secondary)]">
              Article in Language Studio —{" "}
              <Link href={rewriteUrl} className="font-semibold text-emerald-300 underline">
                Open Rewrite
              </Link>
            </p>
          </div>
        ) : null}

        <MatchReportDistributionPanel
          project={project}
          onProjectChange={(next) => {
            onProjectChange(next);
            if (next.archive?.languageStudioUrl) setRewriteUrl(next.archive.languageStudioUrl);
            if (next.status === "published") {
              setPublishedUrl(withAppPathPrefix("/language-studio?tab=Review%20Queue"));
            }
          }}
          disabled={busy}
        />

        <div className="flex flex-wrap gap-2">
          {(["preview", "edit"] as const).map((panel) => (
            <button
              key={panel}
              type="button"
              onClick={() => setReviewPanel(panel)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                reviewPanel === panel
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                  : "border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
              }`}
            >
              {panel === "preview" ? "Output preview" : "Edit source"}
            </button>
          ))}
        </div>

        {reviewPanel === "preview" ? (
          <MatchReportOutputPreview
            project={project}
            content={{
              headline,
              standfirst,
              reportHtml,
              sixteenConclusionsHtml: media.sixteenConclusionsHtml,
              playerRatingsHtml: media.playerRatingsHtml,
            }}
          />
        ) : (
          <>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Headline</span>
              <input
                className={inputClass}
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Standfirst</span>
              <textarea
                className={`${inputClass} min-h-[80px]`}
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                value={standfirst}
                onChange={(e) => setStandfirst(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Full report (HTML)</span>
              <textarea
                className={`${inputClass} min-h-[220px] font-mono text-xs`}
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                value={reportHtml}
                onChange={(e) => setReportHtml(e.target.value)}
              />
            </label>

            {media.sixteenConclusionsHtml ? (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">16 conclusions</h3>
                <div className="mt-3">
                  <SixteenConclusionsList html={media.sixteenConclusionsHtml} />
                </div>
              </section>
            ) : null}
          </>
        )}

        {reviewPanel === "edit" && project.playerIntelligence ? (
          <section className="space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                Player intelligence
              </h3>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                Building intelligence output — ratings appear at the bottom of the published report.
              </p>
            </div>
            <PlayerRatingsTable intelligence={project.playerIntelligence} project={project} />
          </section>
        ) : null}

        {reviewPanel === "edit" && media.playerRatingsHtml && !project.playerIntelligence ? (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Player ratings</h3>
            <div
              className="prose prose-invert mt-2 max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: media.playerRatingsHtml }}
            />
          </section>
        ) : null}

        {reviewPanel === "edit" && project.imageIntelligence?.hero?.url ? (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Hero image</h3>
            <div className="mt-3">
              <HeroPreviewGrid imageIntelligence={project.imageIntelligence} />
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <R365Button variant="ghost" onClick={onBack} disabled={busy}>
            ← Back
          </R365Button>
          <R365Button variant="ghost" onClick={() => run(saveEdits)} disabled={busy}>
            Save edits
          </R365Button>
        </div>
        {publishedUrl ? (
          <p className="text-sm text-emerald-300">
            Published to Review Queue.{" "}
            <Link href={publishedUrl} className="underline">
              Open Review Queue
            </Link>
            {rewriteUrl ? (
              <>
                {" "}
                ·{" "}
                <Link href={rewriteUrl} className="underline">
                  Edit source in Rewrite
                </Link>
              </>
            ) : null}
          </p>
        ) : rewriteUrl ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            Draft is in Language Studio — publish adds the hero image and queues editorial review.
          </p>
        ) : null}
        {error || localError ? <p className="text-sm text-red-300">{error || localError}</p> : null}
      </div>

      <aside
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">EIO summary</h3>
        <div className="mt-3 space-y-3 text-xs text-[color:var(--text-secondary)]">
          <SkippedLayersReport project={project} />
        </div>
      </aside>
    </div>
  );
}
