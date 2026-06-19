"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import "@/app/match-report-builder/match-report-builder-theme.css";
import { Panel } from "@/app/components/Panel";
import { studioApiPath } from "@/app/lib/app-base-path";
import {
  buildEditorialProfile,
  DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
  DEFAULT_MATCH_REPORT_REWRITE_STYLE,
} from "@/app/lib/match-report/editorial-governance";
import {
  aiToneForTargetBrand,
  BRAND_KNOWLEDGE_FILE_IDS,
} from "@/app/lib/match-report/brand-knowledge";
import {
  parseContentTypeParam,
  MATCH_PREVIEW_CONTENT_TYPE,
  MATCH_REPORT_CONTENT_TYPE,
} from "@/app/lib/match-report/content-type";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import type {
  EditorialProfile,
  MatchReportContentType,
  MatchReportFormat,
  MatchReportProject,
  MatchReportScope,
  MatchReportTargetBrand,
} from "@/app/lib/match-report/types";
import { matchReportFormatLabel, isDualReportFormat, DEFAULT_MATCH_REPORT_FORMAT } from "@/app/lib/match-report/match-report-format";
import { parseScheduleCompetitionId } from "@/app/lib/match-report/schedule-competitions";
import { MatchReportTypeStep } from "@/app/match-report-builder/components/MatchReportTypeStep";
import type { WizardScreen } from "@/app/lib/match-report/wizard-steps";
import { ConfidenceStrip } from "@/app/match-report-builder/components/ConfidenceStrip";
import { DataImportSteps } from "@/app/match-report-builder/components/DataImportSteps";
import {
  EditorialBriefForm,
  type EditorialBriefDraft,
} from "@/app/match-report-builder/components/EditorialBriefForm";
import { EventPictureSummary } from "@/app/match-report-builder/components/EventPictureSummary";
import { FoundationSummary } from "@/app/match-report-builder/components/FoundationSummary";
import { GenerationSteps } from "@/app/match-report-builder/components/GenerationSteps";
import { MatchIdLanding } from "@/app/match-report-builder/components/MatchIdLanding";
import { MatchReportNav } from "@/app/match-report-builder/components/MatchReportNav";
import { ProgressModal } from "@/app/match-report-builder/components/ProgressModal";
import { WizardStepsIndicator } from "@/app/match-report-builder/components/WizardStepsIndicator";
import { ReviewScreen } from "@/app/match-report-builder/components/ReviewScreen";
import type { MatchReportJobKind } from "@/app/lib/match-report/jobs";

type Screen = WizardScreen;

type Props = {
  initialProjectId?: string;
};

function emptyBriefDraft(brand?: EditorialBriefDraft["targetBrand"]): EditorialBriefDraft {
  return {
    sport: "football",
    contentStyle: "Match report",
    targetBrand: brand ?? "",
    rewriteStyle: DEFAULT_MATCH_REPORT_REWRITE_STYLE,
    useCreatorProfile: false,
    creatorStyleNotes: "",
    articleGuidelines: DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
  };
}

function buildProfileFromDraft(draft: EditorialBriefDraft): EditorialProfile | null {
  if (!draft.targetBrand) return null;
  const targetBrand = draft.targetBrand;
  const knowledgeFileIds = BRAND_KNOWLEDGE_FILE_IDS[targetBrand];
  const brandStyleGuide = aiToneForTargetBrand(targetBrand) ?? draft.brandStyleGuide;
  return buildEditorialProfile({
    ...draft,
    targetBrand,
    knowledgeFileIds,
    brandStyleGuide,
  });
}

function screenForProject(project: MatchReportProject, eventPictureAcknowledged: boolean): Screen {
  const preview = isMatchPreview(project);
  const postPictureStep = preview ? "image_intelligence" : "player_intelligence";
  if (project.workflowPhase === "review" || project.workflowStep === "review") return "review";
  if (project.status === "published" || project.workflowStep === "published") return "review";
  if (
    ["player_intelligence", "transcripts", "image_intelligence", "media_builder", "fact_check"].includes(
      project.workflowStep,
    ) &&
    (preview || eventPictureAcknowledged)
  ) {
    return "generation";
  }
  if (project.eventPicture && project.workflowStep === postPictureStep && !eventPictureAcknowledged) {
    return "event_picture";
  }
  if (
    project.workflowPhase === "import_layers" ||
    project.workflowStep === "build_picture" ||
    [
      "preview_fixture_context",
      "preview_whoscored",
      "preview_fotmob",
      "sport365",
      "loop_feed",
      "whoscored",
      "manual_sources",
      "league_table",
      "league_stats",
    ].includes(project.workflowStep)
  ) {
    return "import";
  }
  if (project.workflowPhase === "foundation_ready") return "foundation";
  return "import";
}

export function MatchReportBuilderClient({ initialProjectId }: Props) {
  const searchParams = useSearchParams();
  const resumeId = initialProjectId ?? searchParams.get("project")?.trim() ?? "";
  const prefilledMatchId = searchParams.get("match_id")?.trim() ?? searchParams.get("matchId")?.trim() ?? "";
  const prefilledSportId = searchParams.get("sport_id")?.trim() ?? searchParams.get("sportId")?.trim() ?? "1";
  const prefilledBetwayId = searchParams.get("betway_id")?.trim() ?? searchParams.get("betwayId")?.trim() ?? "";
  const prefilledBrand = searchParams.get("brand")?.trim() as EditorialBriefDraft["targetBrand"] | undefined;
  const prefilledCompetition = parseScheduleCompetitionId(searchParams.get("competition")?.trim());
  const prefilledContentType = parseContentTypeParam(searchParams.get("content_type")?.trim());

  const [screen, setScreen] = useState<Screen>("report_type");
  const [contentType, setContentType] = useState<MatchReportContentType>(prefilledContentType);
  const [reportFormat, setReportFormat] = useState<MatchReportFormat>(DEFAULT_MATCH_REPORT_FORMAT);
  const [pairedProject, setPairedProject] = useState<MatchReportProject | null>(null);
  const [eventPictureAcknowledged, setEventPictureAcknowledged] = useState(false);
  const [briefDraft, setBriefDraft] = useState<EditorialBriefDraft>(emptyBriefDraft(prefilledBrand));
  const [awayBriefDraft, setAwayBriefDraft] = useState<EditorialBriefDraft>(emptyBriefDraft());
  const [editorial, setEditorial] = useState<EditorialProfile | null>(null);
  const [awayEditorial, setAwayEditorial] = useState<EditorialProfile | null>(null);
  const [project, setProject] = useState<MatchReportProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobKind, setJobKind] = useState<MatchReportJobKind>("build_picture");
  const [progressOpen, setProgressOpen] = useState(false);

  const scheduleDeepLink = useMemo(() => {
    if (resumeId) return false;
    const brand = prefilledBrand;
    if (!brand || !(brand in BRAND_KNOWLEDGE_FILE_IDS)) return false;
    return Boolean(prefilledMatchId || prefilledBetwayId);
  }, [resumeId, prefilledBrand, prefilledMatchId, prefilledBetwayId]);

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(id)}`));
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Failed to load project");
      setProject(data.project);
      setContentType(data.project.contentType ?? MATCH_REPORT_CONTENT_TYPE);
      setEditorial(data.project.editorial);
      setReportFormat(data.project.reportFormat);
      if (data.project.pairedProjectId) {
        const pairedRes = await fetch(
          studioApiPath(`/api/match-report/projects/${encodeURIComponent(data.project.pairedProjectId)}`),
        );
        const pairedData = (await pairedRes.json()) as { project?: MatchReportProject };
        setPairedProject(pairedRes.ok && pairedData.project ? pairedData.project : null);
      } else {
        setPairedProject(null);
      }
      const acknowledged =
        Boolean(data.project.playerIntelligence) ||
        !["player_intelligence"].includes(data.project.workflowStep) ||
        Boolean(data.project.mediaOutputs);
      setEventPictureAcknowledged(acknowledged);
      setScreen(screenForProject(data.project, acknowledged));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resumeId) void loadProject(resumeId);
  }, [resumeId, loadProject]);

  useEffect(() => {
    if (!scheduleDeepLink || editorial) return;
    const targetBrand = prefilledBrand as MatchReportTargetBrand;
    const knowledgeFileIds = BRAND_KNOWLEDGE_FILE_IDS[targetBrand];
    const brandStyleGuide = aiToneForTargetBrand(targetBrand) ?? undefined;
    const profile = buildEditorialProfile({
      sport: "football",
      contentStyle: prefilledContentType === MATCH_PREVIEW_CONTENT_TYPE ? "Match preview" : "Match report",
      targetBrand,
      rewriteStyle: DEFAULT_MATCH_REPORT_REWRITE_STYLE,
      useCreatorProfile: false,
      creatorStyleNotes: "",
      articleGuidelines: DEFAULT_MATCH_REPORT_EDITORIAL_GUIDELINES,
      knowledgeFileIds,
      brandStyleGuide,
    });
    setEditorial(profile);
  }, [scheduleDeepLink, editorial, prefilledBrand, prefilledContentType]);

  useEffect(() => {
    if (project) setScreen(screenForProject(project, eventPictureAcknowledged));
  }, [project, eventPictureAcknowledged]);

  const panelTitle = useMemo(() => {
    if (screen === "report_type") return "Content type";
    if (screen === "editorial") return "Editorial brief";
    if (screen === "match_id") return "Match ID";
    if (screen === "foundation") return "SixLogics foundation";
    if (screen === "event_picture") return "Event picture";
    if (screen === "generation") return "Generate content";
    if (screen === "review") return "Review & publish";
    return "Import data";
  }, [screen]);

  const handleContinueToMatchId = () => {
    const homeProfile = buildProfileFromDraft(briefDraft);
    if (!homeProfile) return;
    if (contentType === MATCH_PREVIEW_CONTENT_TYPE && isDualReportFormat(reportFormat)) {
      setReportFormat(DEFAULT_MATCH_REPORT_FORMAT);
    }
    if (isDualReportFormat(reportFormat) && contentType !== MATCH_PREVIEW_CONTENT_TYPE) {
      const awayProfile = buildProfileFromDraft(awayBriefDraft);
      if (!awayProfile) return;
      setEditorial(homeProfile);
      setAwayEditorial(awayProfile);
    } else {
      setEditorial(homeProfile);
      setAwayEditorial(null);
    }
    setError(null);
    setScreen("match_id");
  };

  const handleImport = async (input: { matchId: string; sportId: string; reportScope: MatchReportScope }) => {
    if (!editorial) return;
    setLoading(true);
    setError(null);
    setPairedProject(null);
    try {
      const res = await fetch(studioApiPath("/api/match-report/projects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: input.matchId,
          sportId: input.sportId,
          contentType,
          reportScope: input.reportScope,
          reportFormat,
          editorial,
          ...(isDualReportFormat(reportFormat) && awayEditorial ? { awayEditorial } : {}),
        }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        pairedProject?: MatchReportProject;
        error?: string;
        missingCore?: string[];
      };
      if (!res.ok) {
        const missing = Array.isArray(data.missingCore) ? data.missingCore.join(", ") : "";
        throw new Error(
          missing ? `${data.error ?? "Import failed"} (${missing})` : (data.error ?? "Import failed"),
        );
      }
      if (!data.project) throw new Error("Import succeeded but no project was returned.");
      setProject(data.project);
      setPairedProject(data.pairedProject ?? null);
      setEventPictureAcknowledged(false);
      setScreen("foundation");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRetreatImport = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}/retreat`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "import" }),
      });
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Back failed");
      setProject(data.project);
      setScreen(data.project.workflowPhase === "foundation_ready" ? "foundation" : "import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Back failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRetreatGeneration = async () => {
    if (!project) return;
    if (project.workflowStep === "player_intelligence") {
      setEventPictureAcknowledged(false);
      setScreen("event_picture");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}/retreat`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "generation" }),
      });
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Back failed");
      setProject(data.project);
      setScreen("generation");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Back failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRetreatToBuildPicture = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowStep: "build_picture", workflowPhase: "generation" }),
      });
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Back failed");
      setProject(data.project);
      setEventPictureAcknowledged(false);
      setScreen("import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Back failed");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFromFoundation = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}/advance`), {
        method: "POST",
      });
      const data = (await res.json()) as { project?: MatchReportProject; error?: string };
      if (!res.ok || !data.project) throw new Error(data.error || "Advance failed");
      setProject(data.project);
      setScreen("import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Advance failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildPicture = async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(studioApiPath("/api/match-report/build-picture"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = (await res.json()) as {
        async?: boolean;
        jobId?: string;
        project?: MatchReportProject;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Build Picture failed");
      if (data.async && data.jobId) {
        setJobKind("build_picture");
        setJobId(data.jobId);
        setProgressOpen(true);
        return;
      }
      if (data.project) {
        setProject(data.project);
        setEventPictureAcknowledged(false);
        setScreen("event_picture");
      } else {
        await loadProject(project.id);
        setEventPictureAcknowledged(false);
        setScreen("event_picture");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build Picture failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAsyncJob = (id: string, kind: MatchReportJobKind) => {
    setJobKind(kind);
    setJobId(id);
    setProgressOpen(true);
  };

  const handleProgressComplete = async () => {
    setProgressOpen(false);
    if (!project) return;
    await loadProject(project.id);
    if (jobKind === "build_picture") {
      setEventPictureAcknowledged(false);
      setScreen("event_picture");
    } else if (jobKind === "generate_media") {
      setScreen("review");
    }
  };

  const handleStartOver = () => {
    setProject(null);
    setPairedProject(null);
    setEditorial(null);
    setAwayEditorial(null);
    setBriefDraft(emptyBriefDraft());
    setAwayBriefDraft(emptyBriefDraft());
    setError(null);
    setJobId(null);
    setProgressOpen(false);
    setEventPictureAcknowledged(false);
    setReportFormat(DEFAULT_MATCH_REPORT_FORMAT);
    setScreen("report_type");
  };

  const switchToPairedProject = async () => {
    if (!project?.pairedProjectId) return;
    await loadProject(project.pairedProjectId);
  };

  return (
    <div className="match-report-builder space-y-6">
      <MatchReportNav active="generate" />
      <WizardStepsIndicator
        screen={screen}
        project={project}
        eventPictureAcknowledged={eventPictureAcknowledged}
      />
      <Panel title={panelTitle}>
        {screen === "report_type" && !resumeId ? (
          <MatchReportTypeStep
            contentType={contentType}
            onContentTypeChange={setContentType}
            value={reportFormat}
            onChange={setReportFormat}
            onContinue={() => {
              setError(null);
              setScreen(scheduleDeepLink ? "match_id" : "editorial");
            }}
          />
        ) : null}
        {screen === "editorial" && !resumeId ? (
          <EditorialBriefForm
            value={briefDraft}
            onChange={setBriefDraft}
            awayValue={awayBriefDraft}
            onAwayChange={setAwayBriefDraft}
            reportFormat={reportFormat}
            onContinue={handleContinueToMatchId}
            onBack={() => setScreen("report_type")}
            reportFormatLabel={matchReportFormatLabel(reportFormat)}
          />
        ) : null}
        {screen === "match_id" && editorial ? (
          <MatchIdLanding
            editorial={editorial}
            awayEditorial={awayEditorial}
            reportFormat={reportFormat}
            onBack={() => setScreen(scheduleDeepLink ? "report_type" : "editorial")}
            onSubmit={handleImport}
            loading={loading}
            error={error}
            initialMatchId={prefilledMatchId}
            initialSportId={prefilledSportId}
            initialBetwayId={prefilledBetwayId}
            initialCompetition={prefilledCompetition}
          />
        ) : null}
        {pairedProject && project ? (
          <div
            className="mb-4 rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: "rgba(56,189,248,0.35)", background: "rgba(14,116,144,0.12)" }}
          >
            <p className="font-semibold text-sky-200">Neutral dual reports</p>
            <p className="mt-1 text-[color:var(--text-secondary)]">
              Editing{" "}
              <strong className="text-[color:var(--text-primary)]">
                {matchReportFormatLabel(project.reportFormat)}
              </strong>
              . A linked{" "}
              <strong className="text-[color:var(--text-primary)]">
                {matchReportFormatLabel(pairedProject.reportFormat)}
              </strong>{" "}
              was created from the same import.
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-sky-300 underline"
              onClick={() => void switchToPairedProject()}
            >
              Switch to {matchReportFormatLabel(pairedProject.reportFormat)} →
            </button>
          </div>
        ) : null}
        {screen === "foundation" && project ? (
          <FoundationSummary
            project={project}
            onContinue={handleContinueFromFoundation}
            onStartOver={handleStartOver}
            onBack={() => setScreen("match_id")}
            loading={loading}
          />
        ) : null}
        {screen === "import" && project ? (
          <DataImportSteps
            project={project}
            onProjectChange={(next) => {
              setProject(next);
              if (next.workflowPhase === "foundation_ready") setScreen("foundation");
            }}
            onBuildPicture={handleBuildPicture}
            busy={loading}
            error={error}
          />
        ) : null}
        {screen === "event_picture" && project ? (
          <EventPictureSummary
            project={project}
            onProjectChange={setProject}
            onContinue={() => {
              setEventPictureAcknowledged(true);
              setScreen("generation");
            }}
            onStartOver={handleStartOver}
            onBack={() => void handleRetreatToBuildPicture()}
          />
        ) : null}
        {screen === "generation" && project ? (
          <GenerationSteps
            project={project}
            pairedProject={pairedProject}
            onProjectChange={(next) => setProject(next)}
            onPairedProjectChange={setPairedProject}
            onAsyncJob={handleAsyncJob}
            onBack={() => void handleRetreatGeneration()}
            busy={loading}
            error={error}
          />
        ) : null}
        {screen === "review" && project ? (
          <ReviewScreen
            project={project}
            onProjectChange={(next) => setProject(next)}
            onBack={() => void handleRetreatGeneration()}
            busy={loading}
            error={error}
          />
        ) : null}
        {loading && resumeId && !project ? (
          <p className="text-sm text-[color:var(--text-secondary)]">Loading project…</p>
        ) : null}
      </Panel>
      {project ? <ConfidenceStrip project={project} /> : null}
      <ProgressModal
        jobId={jobId ?? ""}
        projectId={project?.id}
        kind={jobKind}
        open={progressOpen}
        onComplete={() => void handleProgressComplete()}
        onError={(message) => {
          setProgressOpen(false);
          setError(message);
        }}
      />
    </div>
  );
}
