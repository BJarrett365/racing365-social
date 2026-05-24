import "server-only";

import fs from "fs/promises";
import path from "path";
import { loopFeedEditorDigest, type LoopFeedContext } from "@/app/lib/data-studio/loop-feed";
import {
  dedupeManualSourcesById,
  extractManualSourcesFromLoopFeed,
} from "@/app/lib/match-report/extract-manual-sources-from-loop-feed";
import { incrementJournalistSocialPostCounts } from "@/app/lib/language-studio/journalist-stats";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";
import {
  registerMatchReportCalendarFixture,
  markMatchReportCalendarComplete,
} from "@/app/lib/match-report/fixture-calendar";
import { fetchSportccFixture } from "@/app/lib/data-studio/sixlogics-fixture";
import { baselineConfidence } from "@/app/lib/match-report/confidence";
import { applyCompetitionRules } from "@/app/lib/match-report/competition-rules";
import { buildEditorialProfile } from "@/app/lib/match-report/editorial-governance";
import { resolveEditorialContext } from "@/app/lib/match-report/editorial-governance-server";
import {
  applyHealthUpdate,
  nextImportStep,
  prevImportStep,
  skipLayerEntry,
  upsertSkippedLayer,
} from "@/app/lib/match-report/health-check";
import { newMatchReportProjectId } from "@/app/lib/match-report/ids";
import {
  assessSixLogicHealth,
  buildDisplayLabel,
  normaliseSixLogicFoundation,
} from "@/app/lib/match-report/normalise-sixlogics";
import {
  reconcileOptaPlayerData,
  reconcilePlayerIntelligence,
} from "@/app/lib/match-report/reconcile-player-ratings";
import {
  DEFAULT_MATCH_REPORT_FORMAT,
  matchReportFormatShortLabel,
  resolveReportScope,
  storedReportFormat,
} from "@/app/lib/match-report/match-report-format";
import type {
  CreateMatchReportProjectInput,
  CreateMatchReportProjectResult,
  EditorialProfile,
  EventPicture,
  ImageIntelligence,
  InterviewIntelligence,
  LeagueTableIntelligence,
  LeagueSeasonStatsIntelligence,
  LoopFeedIntelligence,
  ManualSource,
  MatchReportIndex,
  MatchReportPerspective,
  MatchReportProject,
  MatchReportScope,
  MatchReportWorkflowStep,
  MediaOutputs,
  PatchMatchReportProjectInput,
  PlayerIntelligence,
  SavedReportIndexEntry,
  SixLogicFoundation,
  Sport365Commentary,
  FixtureContextIntelligence,
} from "@/app/lib/match-report/types";
import type { OptaPlayerIntelligence } from "@/app/lib/match-report/opta-player-types";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { localJsonStorePath } from "@/app/lib/local-json-store-dir";

const BLOB_STORE_NAME = "plexa-match-report";
const INDEX_KEY = "index.json";
const LOCAL_ROOT = "plexa-match-report";

function nowIso(): string {
  return new Date().toISOString();
}

function emptyIndex(): MatchReportIndex {
  return { version: 1, entries: [] };
}

function projectKey(id: string): string {
  return `projects/${id}/project.json`;
}

function sixLogicFoundationKey(id: string): string {
  return `projects/${id}/layers/sixlogic-foundation.json`;
}

function sixLogicRawKey(id: string): string {
  return `projects/${id}/layers/sixlogic-raw.json`;
}

function localRootDir(): string {
  return localJsonStorePath(LOCAL_ROOT);
}

function localIndexPath(): string {
  return path.join(localRootDir(), "index.json");
}

function localProjectPath(id: string): string {
  return path.join(localRootDir(), "projects", id, "project.json");
}

function localSixLogicFoundationPath(id: string): string {
  return path.join(localRootDir(), "projects", id, "layers", "sixlogic-foundation.json");
}

function localSixLogicRawPath(id: string): string {
  return path.join(localRootDir(), "projects", id, "layers", "sixlogic-raw.json");
}

async function readIndex(): Promise<MatchReportIndex> {
  if (shouldUseNetlifyBlobStore()) {
    const data = await readJsonBlob<MatchReportIndex>(BLOB_STORE_NAME, INDEX_KEY);
    return data?.entries ? data : emptyIndex();
  }
  try {
    const raw = await fs.readFile(localIndexPath(), "utf-8");
    const parsed = JSON.parse(raw) as MatchReportIndex;
    return parsed?.entries ? parsed : emptyIndex();
  } catch {
    return emptyIndex();
  }
}

async function writeIndex(index: MatchReportIndex): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, INDEX_KEY, index);
    return;
  }
  const full = localIndexPath();
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(index, null, 2), "utf-8");
}

async function readJsonFile<T>(full: string, blobKey: string): Promise<T | null> {
  if (shouldUseNetlifyBlobStore()) {
    return readJsonBlob<T>(BLOB_STORE_NAME, blobKey);
  }
  try {
    const raw = await fs.readFile(full, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type SixLogicRawRecord = {
  payload?: unknown;
  matchId?: string;
  sportId?: string;
};

async function refreshSixLogicLayer(project: MatchReportProject): Promise<MatchReportProject> {
  const existing = project.layers.sixLogic;
  if (!existing) return project;
  const raw = await readJsonFile<SixLogicRawRecord>(
    localSixLogicRawPath(project.id),
    sixLogicRawKey(project.id),
  );
  if (!raw?.payload) return project;
  const refreshed = normaliseSixLogicFoundation({
    payload: raw.payload,
    matchId: raw.matchId ?? project.matchId,
    sportId: raw.sportId ?? project.sportId,
  });
  refreshed.facts.competitionCode = existing.facts.competitionCode ?? refreshed.facts.competitionCode;
  return {
    ...project,
    layers: { ...project.layers, sixLogic: refreshed },
  };
}

async function writeJsonFile<T>(full: string, blobKey: string, data: T): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, blobKey, data);
    return;
  }
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2), "utf-8");
}

function indexEntryFromProject(project: MatchReportProject): SavedReportIndexEntry {
  return {
    projectId: project.id,
    matchId: project.matchId,
    sport: project.sport,
    contentType: project.contentType,
    competitionCode: project.editorial.competitionCode,
    homeTeam: project.homeTeam,
    awayTeam: project.awayTeam,
    homeScore: project.homeScore,
    awayScore: project.awayScore,
    targetBrand: project.editorial.targetBrand,
    brandStyle: project.editorial.brandStyle,
    creatorName: project.editorial.creatorName,
    displayLabel: project.displayLabel,
    matchDate: project.layers.sixLogic?.facts.kickoffIso,
    confidence: project.confidence,
    workflowStep: project.workflowStep,
    publishedAt: project.status === "published" ? project.updatedAt : undefined,
    reportCompleted: Boolean(project.mediaOutputs),
    updatedAt: project.updatedAt,
  };
}

export class MatchReportStoreError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION" | "SIXLOGICS_STOP" | "NOT_FOUND",
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MatchReportStoreError";
  }
}

export class MatchReportRepository {
  async listIndexEntries(): Promise<SavedReportIndexEntry[]> {
    const index = await readIndex();
    return [...index.entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<MatchReportProject | null> {
    const project = await readJsonFile<MatchReportProject>(localProjectPath(id), projectKey(id));
    if (!project) return null;
    const normalized: MatchReportProject = {
      ...project,
      reportFormat: project.reportFormat ?? DEFAULT_MATCH_REPORT_FORMAT,
      reportScope: project.reportScope ?? "full",
      layers: {
        ...project.layers,
        fixtureContext: project.layers.fixtureContext ?? null,
        leagueSeasonStats: project.layers.leagueSeasonStats ?? null,
      },
    };
    return refreshSixLogicLayer(normalized);
  }

  async getSixLogicFoundation(id: string) {
    return readJsonFile(localSixLogicFoundationPath(id), sixLogicFoundationKey(id));
  }

  async createProject(input: CreateMatchReportProjectInput): Promise<CreateMatchReportProjectResult> {
    const matchId = input.matchId.trim();
    const sportId = (input.sportId ?? "1").trim();
    if (!/^\d+$/.test(matchId)) {
      throw new MatchReportStoreError("matchId must be numeric", "VALIDATION");
    }
    if (!/^\d+$/.test(sportId)) {
      throw new MatchReportStoreError("sportId must be numeric", "VALIDATION");
    }
    if (!input.editorial?.targetBrand) {
      throw new MatchReportStoreError("targetBrand is required", "VALIDATION");
    }

    const editorialContext = await resolveEditorialContext({
      ...input.editorial,
      targetBrand: input.editorial.targetBrand,
    });
    const { payload } = await fetchSportccFixture({ sportId, matchId });
    const foundation = normaliseSixLogicFoundation({ payload, matchId, sportId });
    const health = assessSixLogicHealth(foundation);
    if (!health.ok) {
      throw new MatchReportStoreError("SixLogic core data is incomplete", "SIXLOGICS_STOP", {
        missingCore: health.missingCore,
        health,
        foundation,
      });
    }

    const competition = applyCompetitionRules(foundation.facts, editorialContext.sportRules);
    const profile = buildEditorialProfile(
      {
        ...editorialContext.profile,
        competitionCode: competition.competitionCode,
        sportRuleIds: competition.sportRuleIds,
      },
      editorialContext.journalist,
    );
    foundation.facts.competitionCode = competition.competitionCode;

    const requestedFormat = input.reportFormat ?? DEFAULT_MATCH_REPORT_FORMAT;
    const reportScope = resolveReportScope(requestedFormat, input.reportScope);
    const ts = nowIso();

    if (requestedFormat === "neutral_dual") {
      if (!input.awayEditorial?.targetBrand) {
        throw new MatchReportStoreError("awayEditorial.targetBrand is required for neutral dual reports", "VALIDATION");
      }
      const awayEditorialContext = await resolveEditorialContext({
        ...input.awayEditorial,
        targetBrand: input.awayEditorial.targetBrand,
      });
      const awayProfile = buildEditorialProfile(
        {
          ...awayEditorialContext.profile,
          competitionCode: competition.competitionCode,
          sportRuleIds: competition.sportRuleIds,
        },
        awayEditorialContext.journalist,
      );

      const home = await this.persistNewProject({
        foundation,
        payload,
        profile,
        matchId,
        sportId,
        reportFormat: "home",
        reportScope,
        ts,
      });
      const away = await this.persistNewProject({
        foundation,
        payload,
        profile: awayProfile,
        matchId,
        sportId,
        reportFormat: "away",
        reportScope,
        pairedProjectId: home.id,
        ts,
      });
      home.pairedProjectId = away.id;
      await this.saveProject(home);
      return { project: home, pairedProject: away };
    }

    const project = await this.persistNewProject({
      foundation,
      payload,
      profile,
      matchId,
      sportId,
      reportFormat: storedReportFormat(requestedFormat),
      reportScope,
      ts,
      calendarEventId: input.calendarEventId,
      calendarPhase: input.calendarPhase,
    });
    return { project };
  }

  private async persistNewProject(args: {
    foundation: SixLogicFoundation;
    payload: unknown;
    profile: EditorialProfile;
    matchId: string;
    sportId: string;
    reportFormat: MatchReportPerspective;
    reportScope: MatchReportScope;
    pairedProjectId?: string;
    ts: string;
    calendarEventId?: string;
    calendarPhase?: "pre_match" | "live" | "report_post";
  }): Promise<MatchReportProject> {
    const id = newMatchReportProjectId();
    const project: MatchReportProject = {
      id,
      sport: "football",
      contentType: "match_report",
      reportScope: args.reportScope,
      reportFormat: args.reportFormat,
      pairedProjectId: args.pairedProjectId,
      editorial: args.profile,
      matchId: args.matchId,
      sportId: args.sportId,
      competition: args.foundation.facts.competition,
      homeTeam: args.foundation.facts.homeTeam,
      awayTeam: args.foundation.facts.awayTeam,
      homeScore: args.foundation.facts.homeScore,
      awayScore: args.foundation.facts.awayScore,
      displayLabel: `${buildDisplayLabel(args.foundation)} · ${matchReportFormatShortLabel(args.reportFormat)}`,
      status: "in_progress",
      workflowStep: "competition_rules",
      workflowPhase: "foundation_ready",
      layers: {
        sixLogic: args.foundation,
        sport365Commentary: null,
        leagueTable: null,
        leagueSeasonStats: null,
        fixtureContext: null,
        loopFeed: null,
        optaPlayerData: null,
        interviews: [],
        manualSources: [],
      },
      health: { ok: true, missingCore: [], skippedLayers: [] },
      confidence: baselineConfidence(),
      eventPicture: null,
      playerIntelligence: null,
      imageIntelligence: null,
      mediaOutputs: null,
      archive: null,
      calendarEventId: args.calendarEventId,
      calendarPhase: args.calendarPhase,
      createdAt: args.ts,
      updatedAt: args.ts,
    };

    await writeJsonFile(localProjectPath(id), projectKey(id), project);
    await writeJsonFile(localSixLogicFoundationPath(id), sixLogicFoundationKey(id), args.foundation);
    await writeJsonFile(localSixLogicRawPath(id), sixLogicRawKey(id), {
      fetchedAt: args.ts,
      matchId: args.matchId,
      sportId: args.sportId,
      payload: args.payload,
    });

    const index = await readIndex();
    index.entries = [indexEntryFromProject(project), ...index.entries.filter((row) => row.projectId !== id)];
    await writeIndex(index);
    await registerMatchReportCalendarFixture(project);
    return project;
  }

  async patchProject(id: string, input: PatchMatchReportProjectInput): Promise<MatchReportProject> {
    const existing = await this.getProject(id);
    if (!existing) {
      throw new MatchReportStoreError("Project not found", "NOT_FOUND");
    }
    const editorialContext = input.editorial?.targetBrand
      ? await resolveEditorialContext({
          ...existing.editorial,
          ...input.editorial,
          targetBrand: input.editorial.targetBrand ?? existing.editorial.targetBrand,
        })
      : null;
    const next: MatchReportProject = {
      ...existing,
      reportScope: input.reportScope ?? existing.reportScope,
      status: input.status ?? existing.status,
      workflowStep: input.workflowStep ?? existing.workflowStep,
      workflowPhase: input.workflowPhase ?? existing.workflowPhase,
      mediaOutputs: input.mediaOutputs
        ? { ...(existing.mediaOutputs ?? { headline: "", standfirst: "", reportHtml: "", generatedAt: nowIso() }), ...input.mediaOutputs }
        : existing.mediaOutputs,
      editorial: editorialContext
        ? buildEditorialProfile(
            {
              ...existing.editorial,
              ...input.editorial,
              ...editorialContext.profile,
            },
            editorialContext.journalist,
          )
        : input.editorial
          ? {
              ...existing.editorial,
              ...input.editorial,
              brandStyle:
                input.editorial.brandStyle ??
                existing.editorial.brandStyle,
            }
          : existing.editorial,
      calendarEventId: input.calendarEventId ?? existing.calendarEventId,
      calendarPhase: input.calendarPhase ?? existing.calendarPhase,
      updatedAt: nowIso(),
    };
    await writeJsonFile(localProjectPath(id), projectKey(id), next);
    const index = await readIndex();
    index.entries = [indexEntryFromProject(next), ...index.entries.filter((row) => row.projectId !== id)];
    await writeIndex(index);
    return next;
  }

  async saveProject(project: MatchReportProject): Promise<MatchReportProject> {
    const next = applyHealthUpdate({ ...project, updatedAt: nowIso() });
    await writeJsonFile(localProjectPath(next.id), projectKey(next.id), next);
    const index = await readIndex();
    index.entries = [indexEntryFromProject(next), ...index.entries.filter((row) => row.projectId !== next.id)];
    await writeIndex(index);
    if (next.mediaOutputs) await markMatchReportCalendarComplete(next).catch(() => undefined);
    else await registerMatchReportCalendarFixture(next).catch(() => undefined);
    return next;
  }

  async deleteProject(id: string): Promise<void> {
    const existing = await this.getProject(id);
    if (!existing) {
      throw new MatchReportStoreError("Project not found", "NOT_FOUND");
    }
    const index = await readIndex();
    index.entries = index.entries.filter((row) => row.projectId !== id);
    await writeIndex(index);
    if (!shouldUseNetlifyBlobStore()) {
      await fs.rm(path.join(localRootDir(), "projects", id), { recursive: true, force: true });
    }
  }

  private async requireProject(id: string): Promise<MatchReportProject> {
    const project = await this.getProject(id);
    if (!project) throw new MatchReportStoreError("Project not found", "NOT_FOUND");
    return project;
  }

  async skipLayer(
    id: string,
    layer: MatchReportWorkflowStep,
    reason: string,
  ): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    if (layer === "manual_sources") {
      const loopDerived = project.layers.manualSources.filter((row) => row.derivedFrom === "loop_feed");
      const loopPosts =
        project.layers.loopFeed?.sides.reduce((total, side) => total + side.posts.length, 0) ?? 0;
      if (loopDerived.length > 0 || loopPosts > 0) {
        const next: MatchReportProject = {
          ...project,
          workflowStep: "build_picture",
          workflowPhase: "generation",
          health: {
            ...project.health,
            skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "manual_sources"),
          },
        };
        return this.saveProject(next);
      }
    }
    const entry = skipLayerEntry(layer, reason);
    const next: MatchReportProject = {
      ...project,
      health: {
        ...project.health,
        skippedLayers: upsertSkippedLayer(project, entry),
      },
      workflowStep: nextImportStep(layer),
      workflowPhase: layer === "manual_sources" ? "generation" : "import_layers",
    };
    return this.saveProject(next);
  }

  async importLoopFeed(id: string, loopFeed: LoopFeedContext): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const languageData = await readLanguageStudioData();
    const journalistProfiles = Object.values(languageData.journalistProfiles);
    const brand =
      project.editorial?.targetBrand === "football365"
        ? "Football365"
        : project.editorial?.targetBrand === "teamtalk"
          ? "TEAMtalk"
          : undefined;
    const imported: LoopFeedIntelligence = {
      contextDate: loopFeed.contextDate,
      fetchedAt: loopFeed.fetchedAt,
      digest: loopFeedEditorDigest(loopFeed),
      sides: loopFeed.sides,
      importedAt: nowIso(),
    };
    const loopManualSources = extractManualSourcesFromLoopFeed(loopFeed, {
      journalistProfiles,
      brand,
    });
    const socialCounts: Record<string, number> = {};
    for (const source of loopManualSources) {
      if (!source.journalistProfileId) continue;
      socialCounts[source.journalistProfileId] = (socialCounts[source.journalistProfileId] ?? 0) + 1;
    }
    await incrementJournalistSocialPostCounts(socialCounts);
    const keptManualSources = project.layers.manualSources.filter((row) => row.derivedFrom !== "loop_feed");
    const next: MatchReportProject = {
      ...project,
      layers: {
        ...project.layers,
        loopFeed: imported,
        manualSources: dedupeManualSourcesById([...keptManualSources, ...loopManualSources]),
      },
      workflowStep: nextImportStep("loop_feed"),
      workflowPhase: "import_layers",
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter(
          (row) => row.layer !== "loop_feed" && row.layer !== "manual_sources",
        ),
      },
    };
    return this.saveProject(next);
  }

  async importManualSource(
    id: string,
    source: Omit<ManualSource, "id" | "importedAt">,
  ): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const row: ManualSource = {
      ...source,
      id: `manual-${Date.now().toString(36)}`,
      importedAt: nowIso(),
    };
    const next: MatchReportProject = {
      ...project,
      layers: {
        ...project.layers,
        manualSources: [...project.layers.manualSources, row],
      },
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "manual_sources"),
      },
    };
    return this.saveProject(next);
  }

  async syncManualSourcesFromLoopFeed(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const loop = project.layers.loopFeed;
    if (!loop) return project;

    const languageData = await readLanguageStudioData();
    const journalistProfiles = Object.values(languageData.journalistProfiles);
    const brand =
      project.editorial?.targetBrand === "football365"
        ? "Football365"
        : project.editorial?.targetBrand === "teamtalk"
          ? "TEAMtalk"
          : undefined;

    const loopManualSources = extractManualSourcesFromLoopFeed(
      {
        contextDate: loop.contextDate,
        fetchedAt: loop.fetchedAt,
        sides: loop.sides,
      },
      { journalistProfiles, brand },
    );
    if (loopManualSources.length === 0) return project;

    const socialCounts: Record<string, number> = {};
    for (const source of loopManualSources) {
      if (!source.journalistProfileId) continue;
      socialCounts[source.journalistProfileId] = (socialCounts[source.journalistProfileId] ?? 0) + 1;
    }
    await incrementJournalistSocialPostCounts(socialCounts);

    const keptManualSources = project.layers.manualSources.filter((row) => row.derivedFrom !== "loop_feed");
    const next: MatchReportProject = {
      ...project,
      layers: {
        ...project.layers,
        manualSources: dedupeManualSourcesById([...keptManualSources, ...loopManualSources]),
      },
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "manual_sources"),
      },
    };
    return this.saveProject(next);
  }

  async completeManualStep(id: string): Promise<MatchReportProject> {
    let project = await this.requireProject(id);
    const hasLoopDerived = project.layers.manualSources.some((row) => row.derivedFrom === "loop_feed");
    if (project.layers.loopFeed && !hasLoopDerived) {
      project = await this.syncManualSourcesFromLoopFeed(id);
    }
    if (project.layers.manualSources.length === 0) {
      return this.skipLayer(id, "manual_sources", "No manual sources added");
    }
    const next: MatchReportProject = {
      ...project,
      workflowStep: "build_picture",
      workflowPhase: "generation",
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "manual_sources"),
      },
    };
    return this.saveProject(next);
  }

  async setEventPicture(id: string, eventPicture: EventPicture): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      eventPicture,
      workflowStep: "player_intelligence",
      workflowPhase: "generation",
      status: "in_progress",
    };
    return this.saveProject(next);
  }

  async importSport365(
    id: string,
    commentary: Sport365Commentary,
    fixtureContext?: FixtureContextIntelligence | null,
  ): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      layers: {
        ...project.layers,
        sport365Commentary: commentary,
        fixtureContext: fixtureContext ?? project.layers.fixtureContext ?? null,
      },
      workflowStep: nextImportStep("sport365"),
      workflowPhase: "import_layers",
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "sport365"),
      },
    };
    return this.saveProject(next);
  }

  async importLeagueTable(id: string, leagueTable: LeagueTableIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      layers: { ...project.layers, leagueTable },
      workflowStep: nextImportStep("league_table"),
      workflowPhase: "import_layers",
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "league_table"),
      },
    };
    return this.saveProject(next);
  }

  async updateLeagueTable(id: string, leagueTable: LeagueTableIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      layers: { ...project.layers, leagueTable },
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "league_table"),
      },
    };
    return this.saveProject(next);
  }

  async importLeagueSeasonStats(id: string, leagueSeasonStats: LeagueSeasonStatsIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      layers: { ...project.layers, leagueSeasonStats },
      workflowStep: nextImportStep("league_stats"),
      workflowPhase: "import_layers",
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "league_stats"),
      },
    };
    return this.saveProject(next);
  }

  async importOptaPlayerData(id: string, data: OptaPlayerIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const reconciledOpta = reconcileOptaPlayerData(project, data);
    const penaltyAdjustment =
      reconciledOpta.partialParse && project.health.skippedLayers.every((s) => s.layer !== "whoscored_partial")
        ? [{ layer: "whoscored_partial", reason: "Partial WhoScored parse", confidencePenalty: 5 }]
        : [];
    const next: MatchReportProject = {
      ...project,
      layers: { ...project.layers, optaPlayerData: reconciledOpta },
      workflowStep: nextImportStep("whoscored"),
      workflowPhase: "import_layers",
      health: {
        ...project.health,
        skippedLayers: [
          ...project.health.skippedLayers.filter((row) => row.layer !== "whoscored" && row.layer !== "whoscored_partial"),
          ...penaltyAdjustment,
        ],
      },
    };
    return this.saveProject(next);
  }

  async setPlayerIntelligence(id: string, playerIntelligence: PlayerIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      playerIntelligence: reconcilePlayerIntelligence(project, playerIntelligence),
      workflowStep: "transcripts",
      workflowPhase: "generation",
    };
    return this.saveProject(next);
  }

  async importInterview(id: string, interview: InterviewIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      layers: {
        ...project.layers,
        interviews: [...project.layers.interviews, interview],
      },
      health: {
        ...project.health,
        skippedLayers: project.health.skippedLayers.filter((row) => row.layer !== "transcripts"),
      },
    };
    return this.saveProject(next);
  }

  async updateInterview(
    id: string,
    interviewId: string,
    patch: Partial<InterviewIntelligence>,
  ): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const interviews = project.layers.interviews.map((row) =>
      row.id === interviewId ? { ...row, ...patch } : row,
    );
    if (!interviews.some((row) => row.id === interviewId)) {
      throw new MatchReportStoreError("Interview not found.", "NOT_FOUND");
    }
    return this.saveProject({
      ...project,
      layers: { ...project.layers, interviews },
    });
  }

  async deleteInterview(id: string, interviewId: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const interviews = project.layers.interviews.filter((row) => row.id !== interviewId);
    if (interviews.length === project.layers.interviews.length) {
      throw new MatchReportStoreError("Interview not found.", "NOT_FOUND");
    }
    return this.saveProject({
      ...project,
      layers: { ...project.layers, interviews },
    });
  }

  async completeTranscriptsStep(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    if (project.layers.interviews.length === 0) {
      return this.skipLayer(id, "transcripts", "No transcripts imported");
    }
    const next: MatchReportProject = {
      ...project,
      workflowStep: "image_intelligence",
      workflowPhase: "generation",
    };
    return this.saveProject(next);
  }

  async skipTranscriptsStep(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      health: {
        ...project.health,
        skippedLayers: upsertSkippedLayer(project, skipLayerEntry("transcripts", "Skipped by user")),
      },
      workflowStep: "image_intelligence",
      workflowPhase: "generation",
    };
    return this.saveProject(next);
  }

  async setImageIntelligence(id: string, imageIntelligence: ImageIntelligence): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      imageIntelligence,
      workflowStep: "media_builder",
      workflowPhase: "generation",
    };
    return this.saveProject(next);
  }

  async skipImageIntelligence(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      health: {
        ...project.health,
        skippedLayers: upsertSkippedLayer(
          project,
          skipLayerEntry("image_intelligence", "Hero image not set — blocked at publish"),
        ),
      },
      workflowStep: "media_builder",
      workflowPhase: "generation",
    };
    return this.saveProject(next);
  }

  async setMediaOutputs(id: string, mediaOutputs: MediaOutputs): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      mediaOutputs,
      workflowStep: "review",
      workflowPhase: "review",
      status: "review",
    };
    return this.saveProject(next);
  }

  async attachLanguageStudioArticle(
    id: string,
    payload: { articleId: string; importId: string; rewriteUrl: string },
  ): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      archive: {
        ...(project.archive ?? {}),
        languageStudioArticleId: payload.articleId,
        languageStudioImportId: payload.importId,
        languageStudioUrl: payload.rewriteUrl,
      },
    };
    return this.saveProject(next);
  }

  async updateMediaOutputs(id: string, patch: Partial<MediaOutputs>): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    if (!project.mediaOutputs) throw new MatchReportStoreError("No media outputs yet", "VALIDATION");
    const next: MatchReportProject = {
      ...project,
      mediaOutputs: { ...project.mediaOutputs, ...patch },
    };
    return this.saveProject(next);
  }

  async markPublished(id: string, archive: NonNullable<MatchReportProject["archive"]>): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      archive,
      status: "published",
      workflowStep: "published",
      workflowPhase: "published",
    };
    return this.saveProject(next);
  }

  async advanceToImportLayers(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const next: MatchReportProject = {
      ...project,
      workflowStep: project.workflowStep === "competition_rules" ? "sport365" : project.workflowStep,
      workflowPhase: "import_layers",
    };
    return this.saveProject(next);
  }

  async retreatImportStep(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    if (project.workflowStep === "sport365") {
      return this.saveProject({
        ...project,
        workflowStep: "competition_rules",
        workflowPhase: "foundation_ready",
      });
    }
    if (project.workflowStep === "build_picture") {
      return this.saveProject({
        ...project,
        workflowStep: "manual_sources",
        workflowPhase: "import_layers",
      });
    }
    const prev = prevImportStep(project.workflowStep);
    if (!prev) {
      throw new MatchReportStoreError("Cannot go back from this step", "VALIDATION");
    }
    return this.saveProject({
      ...project,
      workflowStep: prev,
      workflowPhase: "import_layers",
    });
  }

  async retreatGenerationStep(id: string): Promise<MatchReportProject> {
    const project = await this.requireProject(id);
    const prevByStep: Partial<Record<MatchReportWorkflowStep, MatchReportWorkflowStep>> = {
      transcripts: "player_intelligence",
      image_intelligence: "transcripts",
      media_builder: "image_intelligence",
      review: "media_builder",
    };
    const prev = prevByStep[project.workflowStep];
    if (!prev) {
      throw new MatchReportStoreError("Cannot go back from this step", "VALIDATION");
    }
    return this.saveProject({
      ...project,
      workflowStep: prev,
      workflowPhase: "generation",
      status: prev === "media_builder" && project.status === "review" ? "in_progress" : project.status,
    });
  }
}

let singleton: MatchReportRepository | null = null;

export function getMatchReportRepository(): MatchReportRepository {
  if (!singleton) singleton = new MatchReportRepository();
  return singleton;
}
