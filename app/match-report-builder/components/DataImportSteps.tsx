"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { R365Button } from "@/app/components/R365Button";
import { studioApiPath } from "@/app/lib/app-base-path";
import { LAYER_CONFIDENCE_PENALTIES } from "@/app/lib/match-report/confidence";
import {
  MATCH_REPORT_LOOP_FEED_DATE_FILTER,
  loopFeedDateWindowLabel,
} from "@/app/lib/data-studio/loop-feed";
import { isMatchPreview } from "@/app/lib/match-report/content-type";
import { kickoffContextDate, prevImportStepForProject } from "@/app/lib/match-report/health-check";
import { PREVIEW_IMPORT_LAYER_STEPS } from "@/app/lib/match-report/preview-workflow";
import { defaultLeagueTableUrl, defaultSport365CompetitionUrl, isWorldCupCompetition } from "@/app/lib/match-report/league-table-defaults";
import type {
  FixtureContextIntelligence,
  LeagueSeasonStatsIntelligence,
  LeagueTableIntelligence,
  MatchReportProject,
  MatchReportWorkflowStep,
  Sport365Commentary,
} from "@/app/lib/match-report/types";
import { IMPORT_LAYER_STEPS, stepLabel } from "@/app/lib/match-report/workflow";
import { LOOP_FEED_TEAMS_PATH } from "@/app/lib/configure/paths";
import type { LoopFeedTeamRow } from "@/app/lib/tools/loop-feed-teams-store";
import { filterLoopFeedTeamsByFeedType, matchLoopFeedTeamByName } from "@/app/lib/tools/loop-feed-teams-store";
import { loopFeedTeamDisplayName } from "@/app/lib/tools/loop-feed-team-feed-types";
import {
  ImportLayerProgress,
  ImportStatusCard,
  ImportStepHeader,
  LoopFeedTeamCard,
  importFieldClass,
  importFieldStyle,
  importLabelClass,
} from "@/app/match-report-builder/components/ImportStepUi";
import { sixLogicCommentaryLineCount } from "@/app/lib/match-report/build-sixlogics-commentary";
import {
  buildImportLayerSummaries,
  fixtureContextSummary,
  leagueSeasonStatsSummary,
  leagueTableSummary,
  sport365CommentarySummary,
} from "@/app/lib/match-report/import-layer-summaries";
import {
  formatLoopFeedManualSourcesSummary,
  groupLoopFeedManualSourcesByTeam,
  loopFeedSatisfiesManualSources,
} from "@/app/lib/match-report/extract-manual-sources-from-loop-feed";
import { LoopFeedManualSourcesByTeam } from "@/app/match-report-builder/components/LoopFeedManualSourcesByTeam";
import { WorldCupStandingsRefresh } from "@/app/match-report-builder/components/WorldCupStandingsRefresh";
import { buildManualSourceReporterPickerOptions } from "@/app/lib/match-report/manual-source-reporter-picker";
import type { LoopFeedPriorityReporterRow } from "@/app/lib/tools/loop-feed-priority-reporters-shared";
import type { ManualSourceDraft } from "@/app/match-report-builder/components/ManualSourceForm";
import { ManualSourceForm } from "@/app/match-report-builder/components/ManualSourceForm";

type Props = {
  project: MatchReportProject;
  onProjectChange: (project: MatchReportProject) => void;
  onBuildPicture: () => void;
  busy?: boolean;
  error?: string | null;
};

const LOOP_TEAM_CUSTOM = "__custom";

const STEP_META: Record<
  Extract<
    MatchReportWorkflowStep,
    | "preview_fixture_context"
    | "sport365"
    | "league_table"
    | "league_stats"
    | "loop_feed"
    | "whoscored"
    | "manual_sources"
  >,
  { title: string; help: string; skipPenalty?: number }
> = {
  preview_fixture_context: {
    title: "Form & head-to-head",
    help: "Pull recent form, head-to-head meetings, and upcoming fixtures from the Six Logic foundation feed.",
    skipPenalty: 8,
  },
  sport365: {
    title: "Six Logic commentary",
    help: "Pull live commentary, head-to-head meetings, recent results, and next fixtures from the Six Logic feed imported in the foundation step.",
    skipPenalty: LAYER_CONFIDENCE_PENALTIES.sport365Commentary,
  },
  league_table: {
    title: "League table (Sport365)",
    help: "Import Sport365 standings for position context — Premier League zones, or World Cup group tables with qualification status.",
    skipPenalty: LAYER_CONFIDENCE_PENALTIES.leagueTable,
  },
  league_stats: {
    title: "Top scorers & team stats (Sport365)",
    help: "Import Premier League top scorers and season team stats from Sport365 — goals, penalties, clean sheets, cards, and comeback patterns for goal/event context.",
    skipPenalty: LAYER_CONFIDENCE_PENALTIES.leagueSeasonStats,
  },
  loop_feed: {
    title: "Loop Feed",
    help: "Pick home and away teams from your Loop Feed catalog for match-day social context.",
    skipPenalty: LAYER_CONFIDENCE_PENALTIES.loopFeed,
  },
  whoscored: {
    title: "WhoScored player data",
    help: "Paste a WhoScored Live Statistics URL. Import pulls Summary, Offensive, Defensive, and Passing stats for both teams via the page feed (may take up to a minute).",
    skipPenalty: LAYER_CONFIDENCE_PENALTIES.whoscored,
  },
  manual_sources: {
    title: "Manual sources",
    help: "Editorial colour is pre-loaded from Loop Feed when imported. Add BBC, Sky, or Athletic notes here only if you need extras.",
    skipPenalty: LAYER_CONFIDENCE_PENALTIES.manualSources,
  },
};

function formatLoopFeedTeamOption(team: LoopFeedTeamRow): string {
  return loopFeedTeamDisplayName(team.name, team.feedType);
}

function CompletedImports({ project, hideStep }: { project: MatchReportProject; hideStep?: MatchReportWorkflowStep }) {
  const fixtureContextStep = isMatchPreview(project) ? "preview_fixture_context" : "sport365";
  const HIDE_BY_LAYER: Partial<Record<string, MatchReportWorkflowStep>> = {
    sport365Commentary: "sport365",
    fixtureContext: fixtureContextStep,
    leagueTable: "league_table",
    leagueSeasonStats: "league_stats",
    loopFeed: "loop_feed",
    optaPlayerData: "whoscored",
    manualSources: "manual_sources",
  };

  const cards = buildImportLayerSummaries(project)
    .filter((row) => row.layer !== "sixLogic" && !row.skipped && HIDE_BY_LAYER[row.layer] !== hideStep)
    .map((row) => (
      <ImportStatusCard key={row.layer} variant="success" title={row.title}>
        {row.summary}
      </ImportStatusCard>
    ));

  if (cards.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-[color:var(--text-muted)]">Completed imports</p>
      {cards}
    </div>
  );
}

export function DataImportSteps({ project, onProjectChange, onBuildPicture, busy, error }: Props) {
  const step = project.workflowStep;
  const previewProject = isMatchPreview(project);
  const importLayerSteps = previewProject ? PREVIEW_IMPORT_LAYER_STEPS : IMPORT_LAYER_STEPS;
  const worldCupProject = isWorldCupCompetition(project.competition);
  const loopDerivedManualCount = project.layers.manualSources.filter((row) => row.derivedFrom === "loop_feed").length;
  const loopFeedTeamGroups = useMemo(
    () =>
      groupLoopFeedManualSourcesByTeam({
        manualSources: project.layers.manualSources,
        loopFeed: project.layers.loopFeed,
        homeTeam: project.homeTeam,
        awayTeam: project.awayTeam,
      }),
    [project],
  );
  const manualReadyFromLoop = loopFeedSatisfiesManualSources(project);
  const userManualCount = project.layers.manualSources.length - loopDerivedManualCount;
  const sixLogicFeedLines = useMemo(
    () => (project.layers.sixLogic ? sixLogicCommentaryLineCount(project.layers.sixLogic) : 0),
    [project.layers.sixLogic],
  );
  const [leagueTableUrl, setLeagueTableUrl] = useState(
    project.layers.leagueTable?.sourceUrl ?? defaultLeagueTableUrl(project.competition),
  );
  const [leagueStatsUrl, setLeagueStatsUrl] = useState(
    project.layers.leagueSeasonStats?.sourceUrl ?? defaultSport365CompetitionUrl(project.competition),
  );
  const [whoscoredUrl, setWhoscoredUrl] = useState(project.layers.optaPlayerData?.sourceUrl ?? "");
  const [loopHomeUrl, setLoopHomeUrl] = useState("");
  const [loopAwayUrl, setLoopAwayUrl] = useState("");
  const [loopHomeLabel, setLoopHomeLabel] = useState(project.homeTeam);
  const [loopAwayLabel, setLoopAwayLabel] = useState(project.awayTeam);
  const [loopHomePick, setLoopHomePick] = useState("");
  const [loopAwayPick, setLoopAwayPick] = useState("");
  const [loopTeams, setLoopTeams] = useState<LoopFeedTeamRow[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [priorityReporters, setPriorityReporters] = useState<LoopFeedPriorityReporterRow[]>([]);
  const manualLoopSyncRef = useRef<string | null>(null);

  const defaultContextDate = useMemo(
    () => kickoffContextDate(project.layers.sixLogic?.facts.kickoffIso),
    [project.layers.sixLogic?.facts.kickoffIso],
  );
  const [loopContextDate, setLoopContextDate] = useState(defaultContextDate);

  useEffect(() => {
    setLoopContextDate(defaultContextDate);
  }, [defaultContextDate]);

  const loopTeamsForMatchReport = useMemo(
    () => filterLoopFeedTeamsByFeedType(loopTeams, "commentaries"),
    [loopTeams],
  );
  const loopDateWindow = useMemo(
    () => loopFeedDateWindowLabel(loopContextDate, MATCH_REPORT_LOOP_FEED_DATE_FILTER),
    [loopContextDate],
  );
  const loopFeedSourceOptions = useMemo(
    () =>
      buildManualSourceReporterPickerOptions({
        loopFeed: project.layers.loopFeed,
        reporters: priorityReporters,
        homeTeam: project.homeTeam,
        awayTeam: project.awayTeam,
      }),
    [project.layers.loopFeed, project.homeTeam, project.awayTeam, priorityReporters],
  );

  useEffect(() => {
    if (step !== "manual_sources") return;
    let cancelled = false;
    fetch(studioApiPath("/api/tools/loop-feed-priority-reporters"))
      .then(async (res) => {
        const data = (await res.json()) as { reporters?: LoopFeedPriorityReporterRow[] };
        if (cancelled) return;
        setPriorityReporters(Array.isArray(data.reporters) ? data.reporters.filter((row) => row.active) : []);
      })
      .catch(() => {
        if (!cancelled) setPriorityReporters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    setImportFeedback(null);
  }, [step]);

  useEffect(() => {
    if (step !== "manual_sources") {
      manualLoopSyncRef.current = null;
      return;
    }
    if (!project.layers.loopFeed) return;
    const syncToken = `${project.id}:manual_sources`;
    if (manualLoopSyncRef.current === syncToken) return;
    manualLoopSyncRef.current = syncToken;

    let cancelled = false;
    setSyncingManual(true);
    setLocalError(null);
    void (async () => {
      try {
        const res = await fetch(studioApiPath("/api/match-report/import/manual"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, syncFromLoopFeed: true }),
        });
        const data = (await res.json()) as { project?: MatchReportProject; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.project) throw new Error(data.error || "Loop Feed source sync failed");
        const saved = data.project.layers.manualSources.filter((row) => row.derivedFrom === "loop_feed").length;
        if (saved > 0) {
          setImportFeedback(`${saved} editorial source${saved === 1 ? "" : "s"} saved from Loop Feed`);
        }
        onProjectChange(data.project);
      } catch (e) {
        if (!cancelled) {
          setLocalError(e instanceof Error ? e.message : "Could not save Loop Feed sources");
        }
      } finally {
        if (!cancelled) setSyncingManual(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, project.id, project.layers.loopFeed, onProjectChange]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(studioApiPath("/api/tools/loop-feed-teams"));
        const data = res.ok ? ((await res.json()) as { teams?: LoopFeedTeamRow[] }) : {};
        if (cancelled) return;
        const teams = Array.isArray(data.teams) ? data.teams.filter((t) => t.active !== false) : [];
        setLoopTeams(teams);
        const commentaries = filterLoopFeedTeamsByFeedType(teams, "commentaries");
        const homeMatch = matchLoopFeedTeamByName(commentaries, project.homeTeam, "commentaries");
        const awayMatch = matchLoopFeedTeamByName(commentaries, project.awayTeam, "commentaries");
        if (homeMatch) {
          setLoopHomePick(homeMatch.id);
          setLoopHomeUrl(homeMatch.topicUrl);
          setLoopHomeLabel(homeMatch.name);
        }
        if (awayMatch) {
          setLoopAwayPick(awayMatch.id);
          setLoopAwayUrl(awayMatch.topicUrl);
          setLoopAwayLabel(awayMatch.name);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.homeTeam, project.awayTeam]);

  useEffect(() => {
    if (loopHomePick === "") {
      setLoopHomeUrl("");
      setLoopHomeLabel(project.homeTeam);
      return;
    }
    if (loopHomePick === LOOP_TEAM_CUSTOM) return;
    const t = loopTeamsForMatchReport.find((x) => x.id === loopHomePick);
    if (t) {
      setLoopHomeUrl(t.topicUrl);
      setLoopHomeLabel(t.name);
    }
  }, [loopHomePick, loopTeams, project.homeTeam]);

  useEffect(() => {
    if (loopAwayPick === "") {
      setLoopAwayUrl("");
      setLoopAwayLabel(project.awayTeam);
      return;
    }
    if (loopAwayPick === LOOP_TEAM_CUSTOM) return;
    const t = loopTeamsForMatchReport.find((x) => x.id === loopAwayPick);
    if (t) {
      setLoopAwayUrl(t.topicUrl);
      setLoopAwayLabel(t.name);
    }
  }, [loopAwayPick, loopTeams, project.awayTeam]);

  const goBack = async () => {
    setLocalError(null);
    const res = await fetch(studioApiPath(`/api/match-report/projects/${encodeURIComponent(project.id)}/retreat`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "import" }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Back failed");
    onProjectChange(data.project);
  };

  const skip = async (layer: MatchReportWorkflowStep) => {
    setLocalError(null);
    const res = await fetch(studioApiPath("/api/match-report/import/skip"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, layer }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Skip failed");
    onProjectChange(data.project);
  };

  const importPreviewFixtureContext = async () => {
    setLocalError(null);
    setImportFeedback(null);
    if (!project.layers.sixLogic) throw new Error("Import Six Logic match foundation first.");
    setImporting(true);
    try {
      const res = await fetch(studioApiPath("/api/match-report/import/preview-fixture-context"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        fixtureContext?: FixtureContextIntelligence | null;
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error || "Fixture context import failed");
      if (data.fixtureContext) setImportFeedback(fixtureContextSummary(data.fixtureContext));
      onProjectChange(data.project);
    } finally {
      setImporting(false);
    }
  };

  const importSixLogicCommentary = async () => {
    setLocalError(null);
    setImportFeedback(null);
    if (!project.layers.sixLogic) throw new Error("Import Six Logic match foundation first.");
    if (sixLogicFeedLines === 0) {
      throw new Error("No commentary or match events found in the Six Logic feed for this fixture.");
    }
    setImporting(true);
    try {
      const res = await fetch(studioApiPath("/api/match-report/import/sixlogics-commentary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        commentary?: Sport365Commentary;
        fixtureContext?: FixtureContextIntelligence | null;
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error || "Six Logic commentary import failed");
      const feedbackParts = [];
      if (data.commentary) feedbackParts.push(sport365CommentarySummary(data.commentary));
      if (data.fixtureContext) feedbackParts.push(fixtureContextSummary(data.fixtureContext));
      if (feedbackParts.length > 0) setImportFeedback(feedbackParts.join(" · "));
      onProjectChange(data.project);
    } finally {
      setImporting(false);
    }
  };

  const importLeagueTable = async () => {
    setLocalError(null);
    setImportFeedback(null);
    const url = leagueTableUrl.trim();
    if (!url) throw new Error("Paste a league table URL or skip.");
    setImporting(true);
    try {
      const res = await fetch(studioApiPath("/api/match-report/import/league-table"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, url }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        leagueTable?: LeagueTableIntelligence;
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error || "League table import failed");
      if (data.leagueTable) {
        setImportFeedback(leagueTableSummary(data.leagueTable));
      }
      onProjectChange(data.project);
    } finally {
      setImporting(false);
    }
  };

  const importLeagueStats = async () => {
    setLocalError(null);
    setImportFeedback(null);
    const url = leagueStatsUrl.trim();
    if (!url) throw new Error("Paste a Sport365 competition URL or skip.");
    setImporting(true);
    try {
      const res = await fetch(studioApiPath("/api/match-report/import/league-stats"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, url }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        leagueSeasonStats?: LeagueSeasonStatsIntelligence;
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error || "League stats import failed");
      if (data.leagueSeasonStats) {
        setImportFeedback(leagueSeasonStatsSummary(data.leagueSeasonStats));
      }
      onProjectChange(data.project);
    } finally {
      setImporting(false);
    }
  };

  const importWhoScored = async () => {
    setLocalError(null);
    setImportFeedback(null);
    const url = whoscoredUrl.trim();
    if (!url) throw new Error("Paste a WhoScored URL or skip.");
    setImporting(true);
    try {
      const res = await fetch(studioApiPath("/api/match-report/import/opta-player-data"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, provider: "whoscored", url }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        error?: string;
        opta?: { players?: unknown[] };
      };
      if (!res.ok || !data.project) throw new Error(data.error || "WhoScored import failed");
      const count = Array.isArray(data.opta?.players) ? data.opta.players.length : undefined;
      setImportFeedback(count ? `${count} player rows imported` : "WhoScored data imported");
      onProjectChange(data.project);
    } finally {
      setImporting(false);
    }
  };

  const importLoop = async () => {
    setLocalError(null);
    setImportFeedback(null);
    const sides = [];
    if (loopHomeUrl.trim()) {
      sides.push({ sideLabel: loopHomeLabel.trim() || project.homeTeam, url: loopHomeUrl.trim() });
    }
    if (loopAwayUrl.trim()) {
      sides.push({ sideLabel: loopAwayLabel.trim() || project.awayTeam, url: loopAwayUrl.trim() });
    }
    if (sides.length === 0) throw new Error("Pick at least one team or add a custom Loop Feed URL.");
    setImporting(true);
    try {
      const res = await fetch(studioApiPath("/api/match-report/import/loop-feed"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, contextDate: loopContextDate, sides }),
      });
      const data = (await res.json()) as {
        project?: MatchReportProject;
        loopFeed?: { sides?: Array<{ sideLabel?: string; posts?: unknown[]; error?: string }> };
        error?: string;
      };
      if (!res.ok || !data.project) throw new Error(data.error || "Loop Feed import failed");
      const sideSummary =
        data.loopFeed?.sides
          ?.map((side) => {
            if (side.error) return `${side.sideLabel ?? "Side"}: ${side.error}`;
            const n = Array.isArray(side.posts) ? side.posts.length : 0;
            return `${side.sideLabel ?? "Side"}: ${n} post${n === 1 ? "" : "s"}`;
          })
          .join(" · ") ?? "Loop Feed imported";
      const manualPreload = data.project.layers.manualSources.filter((row) => row.derivedFrom === "loop_feed").length;
      setImportFeedback(
        manualPreload > 0 ? `${sideSummary} · ${manualPreload} editorial sources pre-loaded` : sideSummary,
      );
      onProjectChange(data.project);
    } finally {
      setImporting(false);
    }
  };

  const addManual = async (draft: ManualSourceDraft) => {
    setLocalError(null);
    const res = await fetch(studioApiPath("/api/match-report/import/manual"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        source: draft.source,
        type: draft.type,
        confidence: draft.confidence,
        title: draft.title.trim() || undefined,
        url: draft.url.trim() || undefined,
        excerpt: draft.excerpt,
      }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Manual import failed");
    onProjectChange(data.project);
  };

  const completeManual = async () => {
    setLocalError(null);
    const res = await fetch(studioApiPath("/api/match-report/import/manual"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, complete: true }),
    });
    const data = (await res.json()) as { project?: MatchReportProject; error?: string };
    if (!res.ok || !data.project) throw new Error(data.error || "Complete failed");
    onProjectChange(data.project);
  };

  const runAction = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Action failed");
    }
  };

  const backLabel =
    step === "preview_fixture_context" || step === "sport365"
      ? "Back to foundation"
      : step === "build_picture"
        ? `Back to ${stepLabel("manual_sources")}`
        : `Back to ${stepLabel(prevImportStepForProject(step, project) ?? (previewProject ? "preview_fixture_context" : "sport365"))}`;

  const actionButtons = (primary: ReactNode) => (
    <div className="mrb-action-bar flex flex-wrap gap-3 rounded-2xl border px-4 py-4">
      <R365Button variant="ghost" onClick={() => runAction(goBack)} disabled={busy || importing}>
        ← {backLabel}
      </R365Button>
      {primary}
    </div>
  );

  if (step === "build_picture") {
    return (
      <div className="space-y-5">
        <ImportStepHeader
          eyebrow="Import data"
          title="Ready to build picture"
          description="Optional imports are complete. Run Build Picture to synthesise the event intelligence layer."
        />
        <ImportLayerProgress currentStep={step} steps={importLayerSteps} />
        <CompletedImports project={project} />
        <ImportStatusCard variant="info" title={previewProject ? "Preview confidence" : "Report confidence"}>
          Current score: <strong>{project.confidence}%</strong>
          {project.health.skippedLayers.length > 0 ? (
            <span className="block pt-1 text-[color:var(--text-secondary)]">
              Skipped: {project.health.skippedLayers.map((row) => row.layer).join(", ")}
            </span>
          ) : null}
        </ImportStatusCard>
        {actionButtons(
          <R365Button onClick={onBuildPicture} disabled={busy}>
            {busy ? "Starting Build Picture…" : "Run Build Picture"}
          </R365Button>,
        )}
        {error || localError ? (
          <ImportStatusCard variant="error" title="Something went wrong">
            {error || localError}
          </ImportStatusCard>
        ) : null}
      </div>
    );
  }

  if (
    step === "preview_fixture_context" ||
    step === "sport365" ||
    step === "league_table" ||
    step === "league_stats" ||
    step === "loop_feed" ||
    step === "whoscored" ||
    step === "manual_sources"
  ) {
    const meta = STEP_META[step];

    return (
      <div className="space-y-5">
        <ImportStepHeader
          eyebrow="Import data"
          title={meta.title}
          description={meta.help}
          skipPenalty={meta.skipPenalty}
        />
        <ImportLayerProgress currentStep={step} steps={importLayerSteps} />
        {worldCupProject && step !== "league_table" ? (
          <WorldCupStandingsRefresh project={project} onProjectChange={onProjectChange} compact />
        ) : null}
        <CompletedImports project={project} hideStep={step} />

        {importFeedback ? (
          <ImportStatusCard variant="success" title="Just imported">
            {importFeedback}
          </ImportStatusCard>
        ) : null}

        {step === "preview_fixture_context" ? (
          <div className="space-y-4">
            {project.layers.sixLogic ? (
              <ImportStatusCard variant="info" title="Six Logic foundation">
                {project.layers.sixLogic.facts.homeTeam} v {project.layers.sixLogic.facts.awayTeam} · match{" "}
                {project.layers.sixLogic.matchId}
              </ImportStatusCard>
            ) : (
              <ImportStatusCard variant="warning" title="Foundation required">
                Import the Six Logic match foundation first.
              </ImportStatusCard>
            )}
            {project.layers.fixtureContext ? (
              <ImportStatusCard variant="success" title="Already on file">
                <p className="text-sm">{fixtureContextSummary(project.layers.fixtureContext)}</p>
                <p className="mt-2 whitespace-pre-wrap text-xs text-[color:var(--text-muted)]">
                  {project.layers.fixtureContext.digest}
                </p>
              </ImportStatusCard>
            ) : null}
          </div>
        ) : null}

        {step === "sport365" ? (
          <div className="space-y-4">
            {project.layers.sixLogic ? (
              <ImportStatusCard variant="info" title="Six Logic feed">
                Match <strong>{project.layers.sixLogic.matchId}</strong> ·{" "}
                {project.layers.sixLogic.facts.homeTeam} v {project.layers.sixLogic.facts.awayTeam}
                {sixLogicFeedLines > 0 ? (
                  <>
                    {" "}
                    · <strong>{sixLogicFeedLines}</strong> commentary / event line
                    {sixLogicFeedLines === 1 ? "" : "s"} available
                  </>
                ) : (
                  <> · no commentary lines in feed (skip or re-import foundation)</>
                )}
              </ImportStatusCard>
            ) : (
              <ImportStatusCard variant="warning" title="Foundation required">
                Import the Six Logic match foundation first, then return here to load commentary from the feed.
              </ImportStatusCard>
            )}
            {project.layers.sport365Commentary ? (
              <ImportStatusCard variant="success" title="Already on file">
                {sport365CommentarySummary(project.layers.sport365Commentary)}
              </ImportStatusCard>
            ) : null}
            {project.layers.fixtureContext ? (
              <ImportStatusCard variant="success" title="Fixtures & head-to-head">
                <p className="text-sm">{fixtureContextSummary(project.layers.fixtureContext)}</p>
                <p className="mt-2 whitespace-pre-wrap text-xs text-[color:var(--text-muted)]">
                  {project.layers.fixtureContext.digest}
                </p>
              </ImportStatusCard>
            ) : null}
          </div>
        ) : null}

        {step === "league_table" ? (
          <div className="space-y-4">
            {worldCupProject ? (
              <ImportStatusCard variant="info" title="World Cup group standings">
                Import all 12 groups from{" "}
                <a
                  href="https://www.sport365.com/football/world-cup/group-stage#/standings"
                  className="font-semibold text-sky-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Sport365 group stage standings
                </a>
                . The match group is detected automatically (e.g. Group L: England, Croatia, Ghana, Panama) with
                qualification markers — top two qualify, third may qualify as best third-place team. Tables stay live
                through the tournament — re-import here or use Refresh on later steps; generation auto-refreshes from
                Sport365.
              </ImportStatusCard>
            ) : null}
            {project.layers.leagueTable ? (
              <ImportStatusCard variant="success" title="Already on file">
                {leagueTableSummary(project.layers.leagueTable)}
              </ImportStatusCard>
            ) : null}
            <label className="block space-y-2">
              <span className={importLabelClass}>
                {worldCupProject ? "Group standings URL" : "League table URL"}
              </span>
              <input
                className={importFieldClass}
                style={importFieldStyle}
                value={leagueTableUrl}
                onChange={(e) => setLeagueTableUrl(e.target.value)}
                placeholder={
                  worldCupProject
                    ? "https://www.sport365.com/football/world-cup/group-stage#/standings"
                    : "https://www.sport365.com/football/england/premier-league#/standings"
                }
                disabled={importing}
              />
            </label>
            {project.layers.leagueTable ? (
              <div
                className="max-h-48 overflow-y-auto rounded-xl border p-3 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--surface-muted)", color: "var(--text-secondary)" }}
              >
                <pre className="whitespace-pre-wrap font-sans">{project.layers.leagueTable.digest.slice(0, 1200)}</pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "league_stats" ? (
          <div className="space-y-4">
            <ImportStatusCard variant="info" title="Goal & team context for events">
              Pulls Sport365{" "}
              <a
                href="https://www.sport365.com/football/england/premier-league#/top-scorers"
                className="font-semibold text-sky-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                top scorers
              </a>{" "}
              and{" "}
              <a
                href="https://www.sport365.com/football/england/premier-league#/team-stats"
                className="font-semibold text-sky-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                team stats
              </a>{" "}
              — season goals, penalties, clean sheets, cards, BTTS, and comeback patterns. Match goalscorers are
              cross-referenced automatically from SixLogics events.
            </ImportStatusCard>
            {project.layers.leagueSeasonStats ? (
              <ImportStatusCard variant="success" title="Already on file">
                {leagueSeasonStatsSummary(project.layers.leagueSeasonStats)}
              </ImportStatusCard>
            ) : null}
            <label className="block space-y-2">
              <span className={importLabelClass}>Sport365 competition URL</span>
              <input
                className={importFieldClass}
                style={importFieldStyle}
                value={leagueStatsUrl}
                onChange={(e) => setLeagueStatsUrl(e.target.value)}
                placeholder="https://www.sport365.com/football/england/premier-league"
                disabled={importing}
              />
            </label>
            {project.layers.leagueSeasonStats ? (
              <div
                className="max-h-48 overflow-y-auto rounded-xl border p-3 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--surface-muted)", color: "var(--text-secondary)" }}
              >
                <pre className="whitespace-pre-wrap font-sans">{project.layers.leagueSeasonStats.digest.slice(0, 1600)}</pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "whoscored" ? (
          <div className="space-y-4">
            <ImportStatusCard variant="info" title="Live Statistics page required">
              Open the match on WhoScored, click <strong>Live Statistics</strong>, and paste that URL here.
              Import captures Summary, Offensive, Defensive, and Passing player stats for home and away (first run may take 30–60 seconds).
            </ImportStatusCard>
            {project.layers.optaPlayerData ? (
              <ImportStatusCard variant="success" title="Already on file">
                {project.layers.optaPlayerData.players.length} players imported
              </ImportStatusCard>
            ) : null}
            <label className="block space-y-2">
              <span className={importLabelClass}>WhoScored live statistics URL</span>
              <input
                className={importFieldClass}
                style={importFieldStyle}
                value={whoscoredUrl}
                onChange={(e) => setWhoscoredUrl(e.target.value)}
                placeholder="https://www.whoscored.com/matches/1903453/livestatistics/…"
                disabled={importing}
              />
            </label>
          </div>
        ) : null}

        {step === "loop_feed" ? (
          <div className="space-y-4">
            <ImportStatusCard variant="info" title="Match-day social window">
              Posts are filtered to a window around the anchor date (not a single day), because club feeds
              often include pre-match buildup and post-match reaction either side of kickoff.
              <span className="mt-2 block font-semibold text-[color:var(--text-primary)]">
                Using Loop Feed <strong>Commentaries</strong> topics (Twitter/X club commentary for Match Report).
              </span>
              <span className="mt-2 block">
                Anchor date:{" "}
                <input
                  type="date"
                  className="rounded-lg border px-2 py-1 text-sm font-semibold"
                  style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--text-primary)" }}
                  value={loopContextDate}
                  onChange={(e) => setLoopContextDate(e.target.value.slice(0, 10))}
                  disabled={importing}
                />
              </span>
              <span className="mt-1 block text-[color:var(--text-secondary)]">
                Including posts dated <strong>{loopDateWindow}</strong> ({MATCH_REPORT_LOOP_FEED_DATE_FILTER.lookbackDays}{" "}
                days before · {MATCH_REPORT_LOOP_FEED_DATE_FILTER.lookforwardDays} days after). Manage teams in{" "}
                <Link href={LOOP_FEED_TEAMS_PATH} className="font-bold text-[color:var(--primary)] hover:underline">
                  Tools → Loop Feed teams
                </Link>
                .
              </span>
            </ImportStatusCard>
            {project.layers.loopFeed ? (
              <ImportStatusCard variant="success" title="Already on file">
                Imported for {project.layers.loopFeed.contextDate}
              </ImportStatusCard>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <LoopFeedTeamCard
                teamLabel={project.homeTeam}
                side="home"
                pick={loopHomePick}
                onPickChange={setLoopHomePick}
                teams={loopTeamsForMatchReport}
                formatTeamLabel={formatLoopFeedTeamOption}
                customValue={loopHomeLabel}
                url={loopHomeUrl}
                onCustomLabelChange={setLoopHomeLabel}
                onUrlChange={setLoopHomeUrl}
                customPickValue={LOOP_TEAM_CUSTOM}
                disabled={importing}
              />
              <LoopFeedTeamCard
                teamLabel={project.awayTeam}
                side="away"
                pick={loopAwayPick}
                onPickChange={setLoopAwayPick}
                teams={loopTeamsForMatchReport}
                formatTeamLabel={formatLoopFeedTeamOption}
                customValue={loopAwayLabel}
                url={loopAwayUrl}
                onCustomLabelChange={setLoopAwayLabel}
                onUrlChange={setLoopAwayUrl}
                customPickValue={LOOP_TEAM_CUSTOM}
                disabled={importing}
              />
            </div>
          </div>
        ) : null}

        {step === "manual_sources" ? (
          <div className="space-y-4">
            {syncingManual ? (
              <ImportStatusCard variant="info" title="Saving from Loop Feed">
                Converting club social posts into editorial sources…
              </ImportStatusCard>
            ) : null}
            {loopDerivedManualCount > 0 ? (
              <ImportStatusCard variant="success" title="Pre-loaded from Loop Feed">
                {formatLoopFeedManualSourcesSummary(loopFeedTeamGroups, loopDerivedManualCount, loopDerivedManualCount)}.
                Add BBC/Sky/Athletic notes below if needed.
              </ImportStatusCard>
            ) : manualReadyFromLoop ? (
              <ImportStatusCard variant="info" title="Loop Feed on file">
                {loopFeedTeamGroups
                  .filter((group) => group.postCount > 0 || group.error)
                  .map((group) =>
                    group.error ? `${group.teamLabel}: ${group.error}` : `${group.teamLabel}: ${group.postCount} posts`,
                  )
                  .join(" · ")}{" "}
                — click Continue to extract them as editorial sources for both teams, or skip if you do not need social
                reaction in the report.
              </ImportStatusCard>
            ) : (
              <ImportStatusCard variant="info" title="Optional editorial notes">
                No Loop Feed posts were imported. Paste BBC, Sky, Athletic, or desk notes below, or skip this layer.
              </ImportStatusCard>
            )}
            {(loopDerivedManualCount > 0 || manualReadyFromLoop) && project.layers.loopFeed ? (
              <LoopFeedManualSourcesByTeam project={project} reporters={priorityReporters} maxAuthors={8} />
            ) : null}
            <ManualSourceForm
              onSubmit={addManual}
              busy={busy || importing || syncingManual}
              sourceCount={userManualCount}
              loopFeedPreloaded={loopDerivedManualCount}
              sourcePickerOptions={loopFeedSourceOptions}
            />
          </div>
        ) : null}

        {actionButtons(
          <>
            {step === "loop_feed" ? (
              <R365Button onClick={() => runAction(importLoop)} disabled={busy || importing}>
                {importing ? "Fetching Loop Feed…" : "Import Loop Feed"}
              </R365Button>
            ) : step === "manual_sources" ? (
              <R365Button
                onClick={() => runAction(completeManual)}
                disabled={busy || importing || syncingManual || (!manualReadyFromLoop && project.layers.manualSources.length === 0)}
              >
                {syncingManual
                  ? "Saving Loop Feed sources…"
                  : loopDerivedManualCount > 0 || manualReadyFromLoop
                    ? "Continue with Loop Feed sources"
                    : "Continue"}
              </R365Button>
            ) : step === "preview_fixture_context" ? (
              <R365Button
                onClick={() => runAction(importPreviewFixtureContext)}
                disabled={busy || importing || !project.layers.sixLogic}
              >
                {importing
                  ? "Loading fixture context…"
                  : project.layers.fixtureContext
                    ? "Re-import & continue"
                    : "Import form & H2H & continue"}
              </R365Button>
            ) : step === "sport365" ? (
              <R365Button
                onClick={() => runAction(importSixLogicCommentary)}
                disabled={busy || importing || !project.layers.sixLogic || sixLogicFeedLines === 0}
              >
                {importing
                  ? "Loading from Six Logic…"
                  : project.layers.sport365Commentary
                    ? "Re-import from feed"
                    : "Import from feed & continue"}
              </R365Button>
            ) : step === "league_table" ? (
              <R365Button onClick={() => runAction(importLeagueTable)} disabled={busy || importing || !leagueTableUrl.trim()}>
                {importing ? "Loading table…" : project.layers.leagueTable ? "Re-import table" : "Import table & continue"}
              </R365Button>
            ) : step === "league_stats" ? (
              <R365Button onClick={() => runAction(importLeagueStats)} disabled={busy || importing || !leagueStatsUrl.trim()}>
                {importing ? "Loading season stats…" : project.layers.leagueSeasonStats ? "Re-import stats" : "Import stats & continue"}
              </R365Button>
            ) : (
              <R365Button onClick={() => runAction(importWhoScored)} disabled={busy || importing || !whoscoredUrl.trim()}>
                {importing ? "Loading WhoScored in browser…" : "Import WhoScored"}
              </R365Button>
            )}
            <R365Button variant="ghost" onClick={() => runAction(() => skip(step))} disabled={busy || importing || syncingManual}>
              {step === "manual_sources" && manualReadyFromLoop ? "Skip extra sources" : "Skip this layer"}
            </R365Button>
          </>,
        )}
        {error || localError ? (
          <ImportStatusCard variant="error" title="Import failed">
            {error || localError}
          </ImportStatusCard>
        ) : null}
      </div>
    );
  }

  return null;
}
