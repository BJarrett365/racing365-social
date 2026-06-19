"use client";

import { useMemo } from "react";
import { BRAND_LABEL_BY_TARGET } from "@/app/lib/match-report/editorial-governance";
import { getMergedPreviewFixtureContext } from "@/app/lib/match-report/preview-fixture-context-merge";
import {
  buildPreviewContextRows,
  buildPreviewEvents,
  buildPreviewScoreboard,
  extractPossessionFromCommentary,
  wordCountFromPreviewContent,
} from "@/app/lib/match-report/match-report-preview-data";
import { renderPlayerRatingsHtml } from "@/app/lib/match-report/player-ratings-html";
import type { MatchReportProject, MediaOutputs } from "@/app/lib/match-report/types";
import { extractYouTubeVideoId } from "@/app/lib/youtube-script/utils";
import { PlayerRatingsTable } from "@/app/match-report-builder/components/PlayerRatingsTable";
import { SixteenConclusionsList } from "@/app/match-report-builder/components/SixteenConclusionsList";
import { SocialPostsList, type SocialPostEmbedSource } from "@/app/match-report-builder/components/SocialPostsList";

export type MatchReportPreviewContent = {
  headline: string;
  standfirst: string;
  reportHtml: string;
  sixteenConclusionsHtml?: string;
  playerRatingsHtml?: string;
};

type Props = {
  content: MatchReportPreviewContent;
  project?: MatchReportProject;
  heroImageUrl?: string;
  className?: string;
  usePlayerIntelligenceTable?: boolean;
};

function reportHtmlHasH1(html: string): boolean {
  return /<h1[\s>]/i.test(html);
}

function PreviewCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border ${className}`.trim()}
      style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
    >
      <div className="px-5 py-4 sm:px-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

function MetaBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "green" | "blue" | "amber" | "neutral" | "gold";
}) {
  const tones = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    blue: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    gold: "border-amber-400/40 bg-amber-400/10 text-amber-100",
    neutral: "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function YouTubeInterviewEmbed({ title, url }: { title: string; url?: string }) {
  const videoId = url ? extractYouTubeVideoId(url) : null;
  if (!videoId) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function EventIcon({ type }: { type: "goal" | "yellow" | "red" | "other" }) {
  if (type === "goal") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[11px]" aria-hidden>
        ⚽
      </span>
    );
  }
  if (type === "yellow") {
    return <span className="inline-block h-4 w-3 rounded-sm bg-amber-400" aria-hidden />;
  }
  if (type === "red") {
    return <span className="inline-block h-4 w-3 rounded-sm bg-red-500" aria-hidden />;
  }
  return <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--text-muted)]" aria-hidden />;
}

function ScoreboardCard({ project }: { project?: MatchReportProject }) {
  const board = useMemo(() => (project ? buildPreviewScoreboard(project) : null), [project]);
  if (!board) return null;

  const competitionParts = [
    board.competition.split("·").pop()?.trim() ?? board.competition,
    board.season,
    board.round,
  ].filter(Boolean);

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: "var(--border)",
        background:
          "radial-gradient(circle at 50% 40%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 35%, var(--surface-muted) 70%)",
      }}
    >
      <div className="px-5 py-5 text-center sm:px-8">
        <p className="text-xs text-[color:var(--text-muted)]">{competitionParts.join(" · ")}</p>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="text-left">
            <p className="text-sm font-bold text-[color:var(--text-primary)] sm:text-base">{board.homeTeam}</p>
            {board.homeCoach ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">Coach: {board.homeCoach}</p>
            ) : null}
            {board.homeFormation ? (
              <p className="mt-1 text-xs font-semibold text-emerald-300">{board.homeFormation}</p>
            ) : null}
          </div>

          <div className="text-center">
            <p className="text-4xl font-black tabular-nums tracking-tight text-[color:var(--text-primary)] sm:text-5xl">
              {board.homeScore ?? "—"} — {board.awayScore ?? "—"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold text-[color:var(--text-primary)] sm:text-base">{board.awayTeam}</p>
            {board.awayCoach ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">Coach: {board.awayCoach}</p>
            ) : null}
            {board.awayFormation ? (
              <p className="mt-1 text-xs font-semibold text-sky-300">{board.awayFormation}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t px-5 py-3 text-xs text-[color:var(--text-muted)]"
        style={{ borderColor: "var(--border)", background: "rgba(0,0,0,0.18)" }}
      >
        {board.kickoffIso ? <span>📅 {board.kickoffIso}</span> : null}
        {board.venue ? <span>🏟️ {board.venue}</span> : null}
        {board.attendance != null ? <span>👥 {board.attendance.toLocaleString()}</span> : null}
        {board.status ? <span>⚪ {board.status}</span> : null}
      </div>
    </section>
  );
}

function loopFeedSocialEmbedSources(project?: MatchReportProject): SocialPostEmbedSource[] {
  const loop = project?.layers.loopFeed;
  if (!loop) return [];
  const seen = new Set<string>();
  const out: SocialPostEmbedSource[] = [];

  for (const side of loop.sides) {
    if (side.error) continue;
    for (const post of side.posts) {
      if (!post.postUrl.trim()) continue;
      const key = post.postUrl.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: `${side.sideLabel}-${out.length}-${post.postUrl}`,
        sideLabel: side.sideLabel,
        text: post.text,
        postUrl: post.postUrl,
        author: post.author,
        handle: post.handle,
        time: post.time,
        media: post.media,
      });
    }
  }

  return out.slice(0, 12);
}

function PossessionBar({
  homePct,
  awayPct,
  homeTeam,
  awayTeam,
}: {
  homePct: number;
  awayPct: number;
  homeTeam: string;
  awayTeam: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold tabular-nums">
        <span className="text-emerald-300">{homePct}%</span>
        <span className="text-[color:var(--text-muted)]">Possession</span>
        <span className="text-sky-300">{awayPct}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[color:var(--surface)]">
        <div className="bg-emerald-500" style={{ width: `${homePct}%` }} />
        <div className="bg-sky-600" style={{ width: `${awayPct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-secondary)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {homeTeam}
        </span>
        <span className="inline-flex items-center gap-2">
          {awayTeam}
          <span className="h-2 w-2 rounded-full bg-sky-600" />
        </span>
      </div>
    </div>
  );
}

export function buildMatchReportPreviewSections(content: MatchReportPreviewContent, project?: MatchReportProject): {
  headline: string;
  standfirstHtml: string;
  bodyHtml: string;
  conclusionsHtml: string;
  ratingsHtml: string;
  wordCount: number;
} {
  const ratingsHtml =
    content.playerRatingsHtml ??
    (project?.playerIntelligence ? renderPlayerRatingsHtml(project.playerIntelligence, project) : "");
  const combined = [
    content.headline,
    content.standfirst,
    content.reportHtml,
    content.sixteenConclusionsHtml ?? "",
    ratingsHtml,
  ].join("\n");
  return {
    headline: content.headline,
    standfirstHtml: content.standfirst,
    bodyHtml: content.reportHtml,
    conclusionsHtml: content.sixteenConclusionsHtml ?? "",
    ratingsHtml,
    wordCount: wordCountFromPreviewContent([combined.replace(/<[^>]+>/g, " ")]),
  };
}

export function mediaOutputsToPreviewContent(media: MediaOutputs): MatchReportPreviewContent {
  return {
    headline: media.headline,
    standfirst: media.standfirst,
    reportHtml: media.reportHtml,
    sixteenConclusionsHtml: media.sixteenConclusionsHtml,
    playerRatingsHtml: media.playerRatingsHtml,
  };
}

export function MatchReportOutputPreview({
  content,
  project,
  heroImageUrl,
  className = "",
  usePlayerIntelligenceTable = true,
}: Props) {
  const sections = useMemo(() => buildMatchReportPreviewSections(content, project), [content, project]);
  const brandLabel = project ? BRAND_LABEL_BY_TARGET[project.editorial.targetBrand] : undefined;
  const showHeadlineOutside = sections.headline.trim() && !reportHtmlHasH1(sections.bodyHtml);
  const hero = heroImageUrl ?? project?.imageIntelligence?.hero?.url;

  const possession = useMemo(
    () => extractPossessionFromCommentary(project?.layers.sport365Commentary?.lines ?? []),
    [project?.layers.sport365Commentary?.lines],
  );

  const events = useMemo(() => (project ? buildPreviewEvents(project) : []), [project]);
  const contextRows = useMemo(
    () => (project ? buildPreviewContextRows(project, getMergedPreviewFixtureContext(project)) : []),
    [project],
  );

  const scopeLabel =
    project?.reportScope === "full"
      ? "Full match"
      : project?.reportScope === "first_half"
        ? "Half time"
        : project?.reportScope ?? "Report";

  const interviewBlocks = useMemo(() => {
    return (project?.layers.interviews ?? []).map((interview) => ({
      title: interview.title ?? "Post-match interview",
      body: interview.summary ?? interview.digest,
      url: interview.sourceUrl,
    }));
  }, [project]);

  const socialEmbedSources = useMemo(() => loopFeedSocialEmbedSources(project), [project]);
  const socialPosts = socialEmbedSources.length > 0 ? [] : project?.mediaOutputs?.socialPosts ?? [];

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${className}`.trim()}
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Output preview</p>
          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
            {brandLabel ? `${brandLabel} match report · ` : ""}
            {sections.wordCount.toLocaleString()} words · Sixlogics layout
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {hero ? (
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" className="aspect-video w-full object-cover" />
          </div>
        ) : null}

        <section
          className="rounded-2xl border px-5 py-5 sm:px-6"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {project?.matchId ? <MetaBadge tone="green">MATCH {project.matchId}</MetaBadge> : null}
            <MetaBadge tone="green">v2</MetaBadge>
            <MetaBadge tone="blue">{scopeLabel}</MetaBadge>
            {project?.editorial.creatorName ? (
              <MetaBadge tone="neutral">{project.editorial.creatorName}</MetaBadge>
            ) : null}
            {project?.confidence != null ? (
              <MetaBadge tone="amber">QUALITY {project.confidence}/100</MetaBadge>
            ) : null}
          </div>

          {showHeadlineOutside ? (
            <h1 className="mt-5 text-2xl font-black leading-tight tracking-tight text-[color:var(--text-primary)] sm:text-3xl">
              {sections.headline}
            </h1>
          ) : null}
        </section>

        <ScoreboardCard project={project} />

        {sections.bodyHtml.trim() ? (
          <PreviewCard title="Full Report" className="shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div
              className="prose prose-invert max-w-none text-[15px] leading-8 text-[color:var(--text-secondary)] prose-headings:text-[color:var(--text-primary)] prose-h1:mb-6 prose-h1:text-3xl prose-h1:font-black prose-h1:leading-tight prose-h1:tracking-tight prose-h2:mt-10 prose-h2:border-b prose-h2:border-emerald-400/25 prose-h2:pb-3 prose-h2:text-xl prose-h2:font-black prose-h2:uppercase prose-h2:tracking-[0.12em] prose-h2:text-emerald-300 prose-h3:mt-7 prose-h3:text-lg prose-h3:font-extrabold prose-p:my-5 prose-p:leading-8 prose-li:my-2 prose-li:leading-8 prose-ul:my-5 prose-strong:text-[color:var(--text-primary)] sm:text-base sm:leading-9 sm:prose-p:leading-9 [&_p:first-of-type:first-letter]:float-left [&_p:first-of-type:first-letter]:mr-3 [&_p:first-of-type:first-letter]:mt-1 [&_p:first-of-type:first-letter]:text-6xl [&_p:first-of-type:first-letter]:font-black [&_p:first-of-type:first-letter]:leading-[0.85] [&_p:first-of-type:first-letter]:text-emerald-400"
              dangerouslySetInnerHTML={{ __html: sections.bodyHtml }}
            />
          </PreviewCard>
        ) : (
          <PreviewCard title="Full Report">
            <p className="text-sm text-[color:var(--text-muted)]">No report body yet.</p>
          </PreviewCard>
        )}

        {possession ? (
          <PreviewCard title="Match Stats">
            <PossessionBar
              homePct={possession.homePct}
              awayPct={possession.awayPct}
              homeTeam={project?.homeTeam ?? "Home"}
              awayTeam={project?.awayTeam ?? "Away"}
            />
          </PreviewCard>
        ) : null}

        {events.length > 0 ? (
          <PreviewCard title="Events">
            <ul className="space-y-3">
              {events.map((event, index) => (
                <li
                  key={`${event.minuteLabel}-${event.playerName ?? index}`}
                  className="grid grid-cols-[3.5rem_1.25rem_1fr_auto] items-center gap-3 text-sm"
                >
                  <span className="font-mono text-xs text-[color:var(--text-muted)]">{event.minuteLabel}</span>
                  <EventIcon type={event.type} />
                  <span className="font-medium text-[color:var(--text-primary)]">
                    {event.playerName ?? event.summary ?? event.type}
                  </span>
                  <span className="text-right text-xs text-[color:var(--text-muted)]">{event.teamName}</span>
                </li>
              ))}
            </ul>
          </PreviewCard>
        ) : null}

        {contextRows.length > 0 ? (
          <PreviewCard title="Context">
            <dl className="space-y-3">
              {contextRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="text-[color:var(--text-muted)]">{row.label}</dt>
                  <dd className="max-w-[65%] text-right text-[color:var(--text-secondary)]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </PreviewCard>
        ) : null}

        {usePlayerIntelligenceTable && project?.playerIntelligence ? (
          <PreviewCard title="Player Ratings">
            <PlayerRatingsTable intelligence={project.playerIntelligence} project={project} />
          </PreviewCard>
        ) : sections.ratingsHtml.trim() ? (
          <PreviewCard title="Player Ratings">
            <div
              className="prose prose-invert max-w-none text-sm text-[color:var(--text-primary)] prose-table:w-full prose-th:border prose-th:border-[color:var(--border)] prose-th:bg-[color:var(--surface)] prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-[color:var(--border)] prose-td:px-3 prose-td:py-2"
              dangerouslySetInnerHTML={{ __html: sections.ratingsHtml }}
            />
          </PreviewCard>
        ) : null}

        {sections.conclusionsHtml.trim() ? (
          <PreviewCard title="16 Conclusions">
            <SixteenConclusionsList html={sections.conclusionsHtml} />
          </PreviewCard>
        ) : null}

        {socialEmbedSources.length > 0 || socialPosts.length > 0 ? (
          <PreviewCard title="Social Posts">
            <SocialPostsList posts={socialPosts} embedSources={socialEmbedSources} />
          </PreviewCard>
        ) : null}

        {interviewBlocks.length > 0 ? (
          <PreviewCard title="Post-match Interviews">
            <div className="space-y-5">
              {interviewBlocks.map((block) => (
                <article key={`${block.title}-${block.body.slice(0, 24)}`}>
                  <h4 className="text-sm font-bold text-[color:var(--text-primary)]">{block.title}</h4>
                  <YouTubeInterviewEmbed title={block.title} url={block.url} />
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{block.body}</p>
                  {block.url ? (
                    <a
                      href={block.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-emerald-300 underline"
                    >
                      Source
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </PreviewCard>
        ) : null}
      </div>
    </div>
  );
}
