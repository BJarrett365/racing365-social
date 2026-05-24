import "server-only";

import { withAppPathPrefix } from "@/app/lib/app-base-path";
import {
  getEditorialCalendarEvent,
  linkContentToCalendarPhase,
  listEditorialCalendarEvents,
} from "@/app/lib/editorial-calendar/store";
import { syncFixturesToEditorialCalendar } from "@/app/lib/editorial-calendar/sync-fixtures";
import type { EditorialCalendarEvent } from "@/app/lib/editorial-calendar/types";
import {
  markMatchReportCalendarComplete,
  registerMatchReportCalendarFixture,
} from "@/app/lib/match-report/fixture-calendar";
import {
  matchReportLanguageStudioReviewQueueUrl,
  matchReportLanguageStudioRewriteUrl,
  matchReportLanguageStudioTranslationsUrl,
  syncMatchReportToLanguageStudio,
} from "@/app/lib/match-report/language-studio-bridge";
import { teamNamesMatch } from "@/app/lib/match-report/reconcile-player-ratings";
import type { MatchReportPushAction, MatchReportPushActionResults } from "@/app/lib/match-report/match-report-distribution";
import type { MatchReportProject } from "@/app/lib/match-report/types";
import type { MatchReportRepository } from "@/app/lib/match-report/store";

export type { MatchReportPushAction, MatchReportPushActionResults };

function calendarUrlForEvent(eventId: string): string {
  return withAppPathPrefix(`/editing-studio/calendar?eventId=${encodeURIComponent(eventId)}`);
}

function fixtureMatchesProject(event: EditorialCalendarEvent, project: MatchReportProject): boolean {
  if (event.type !== "fixture") return false;
  if (event.externalIds?.sixLogicMatchId && event.externalIds.sixLogicMatchId === project.matchId) {
    return true;
  }
  return (
    teamNamesMatch(event.homeTeam ?? "", project.homeTeam) &&
    teamNamesMatch(event.awayTeam ?? "", project.awayTeam)
  );
}

async function resolveCalendarEvent(project: MatchReportProject): Promise<EditorialCalendarEvent | null> {
  if (project.calendarEventId) {
    const linked = await getEditorialCalendarEvent(project.calendarEventId);
    if (linked) return linked;
  }

  const findInEvents = (events: EditorialCalendarEvent[]) =>
    events.find((event) => fixtureMatchesProject(event, project)) ?? null;

  let match = findInEvents(await listEditorialCalendarEvents({ sport: "football" }));
  if (match) return match;

  await syncFixturesToEditorialCalendar();
  match = findInEvents(await listEditorialCalendarEvents({ sport: "football" }));
  return match;
}

async function ensureLanguageArticle(
  project: MatchReportProject,
  repo: MatchReportRepository,
  queueForReview: boolean,
): Promise<{ articleId: string; rewriteUrl: string; project: MatchReportProject }> {
  const synced = await syncMatchReportToLanguageStudio(project, { queueForReview });
  const updated = await repo.attachLanguageStudioArticle(project.id, {
    articleId: synced.articleId,
    importId: synced.importId,
    rewriteUrl: synced.rewriteUrl,
  });
  return { articleId: synced.articleId, rewriteUrl: synced.rewriteUrl, project: updated };
}

export async function runMatchReportPushActions(
  repo: MatchReportRepository,
  projectId: string,
  actions: MatchReportPushAction[],
): Promise<{ project: MatchReportProject; results: MatchReportPushActionResults }> {
  let project = await repo.getProject(projectId);
  if (!project) throw new Error("Project not found.");
  if (!project.mediaOutputs) throw new Error("Generate media outputs before pushing this report.");

  const requested = new Set<MatchReportPushAction>();
  for (const action of actions) {
    if (action === "all") {
      requested.add("rewrite");
      requested.add("language");
      requested.add("calendar");
      requested.add("publish");
    } else {
      requested.add(action);
    }
  }

  const results: MatchReportPushActionResults = { warnings: [] };
  const warnings = results.warnings!;

  if (requested.has("rewrite") || requested.has("language") || requested.has("publish")) {
    const synced = await ensureLanguageArticle(project, repo, requested.has("publish"));
    project = synced.project;
    results.rewrite = { articleId: synced.articleId, rewriteUrl: synced.rewriteUrl };
  }

  if (requested.has("language")) {
    const articleId = project.archive?.languageStudioArticleId ?? results.rewrite?.articleId;
    if (articleId) {
      results.language = {
        articleId,
        languageUrl: matchReportLanguageStudioTranslationsUrl(articleId),
      };
    }
  }

  if (requested.has("calendar")) {
    const event = await resolveCalendarEvent(project);
    if (!event) {
      warnings.push("No editorial calendar fixture found — open Schedule Studio and sync fixtures first.");
    } else {
      const phase = project.calendarPhase ?? "report_post";
      const articleId = project.archive?.languageStudioArticleId;
      await linkContentToCalendarPhase({
        eventId: event.id,
        phase,
        matchReportProjectId: project.id,
        languageArticleId: articleId,
      });
      await registerMatchReportCalendarFixture(project);
      await markMatchReportCalendarComplete(project).catch(() => undefined);
      project = await repo.patchProject(project.id, {
        calendarEventId: event.id,
        calendarPhase: phase,
      });
      results.calendar = { eventId: event.id, url: calendarUrlForEvent(event.id) };
    }
  }

  if (requested.has("publish")) {
    if (!project.imageIntelligence?.hero?.url) {
      warnings.push("Publish skipped — add a hero image first.");
    } else {
      const articleId = project.archive?.languageStudioArticleId ?? results.rewrite?.articleId;
      if (!articleId) {
        warnings.push("Publish skipped — Language Studio article missing.");
      } else {
        const synced = await syncMatchReportToLanguageStudio(project, {
          heroImageUrl: project.imageIntelligence.hero.url,
          queueForReview: true,
        });
        const now = new Date().toISOString();
        project = await repo.markPublished(project.id, {
          languageStudioArticleId: synced.articleId,
          languageStudioImportId: synced.importId,
          languageStudioUrl: synced.rewriteUrl,
          publishedArticleId: synced.articleId,
          publishedImportId: synced.importId,
          publishedAt: now,
        });
        results.publish = {
          articleId: synced.articleId,
          reviewUrl: matchReportLanguageStudioReviewQueueUrl(),
          rewriteUrl: synced.rewriteUrl,
        };
        if (results.calendar?.eventId) {
          await linkContentToCalendarPhase({
            eventId: results.calendar.eventId,
            phase: project.calendarPhase ?? "report_post",
            matchReportProjectId: project.id,
            languageArticleId: synced.articleId,
          }).catch(() => undefined);
        }
      }
    }
  }

  if (results.warnings?.length === 0) delete results.warnings;
  return { project, results };
}
