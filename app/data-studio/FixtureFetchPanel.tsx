"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { loadFixturePresets, saveFixturePresets, type FixturePreset } from "@/app/lib/data-studio/fixture-presets";
import type { LoopFeedContext } from "@/app/lib/data-studio/loop-feed";
import type { SportVerticalId, MatchCopyMode } from "@/app/lib/data-studio/types";
import { LOOP_FEED_TEAMS_PATH } from "@/app/lib/configure/paths";
import type { LoopFeedTeamRow } from "@/app/lib/tools/loop-feed-teams-store";
import { filterLoopFeedTeamsByFeedType } from "@/app/lib/tools/loop-feed-teams-store";
import {
  DEFAULT_LOOP_FEED_TEAM_FEED_TYPE,
  LOOP_FEED_TEAM_FEED_TYPES,
  loopFeedTeamDisplayName,
  loopFeedTeamFeedTypeDescription,
  type LoopFeedTeamFeedType,
} from "@/app/lib/tools/loop-feed-team-feed-types";
import { splitArticleForLanguageStudio } from "@/app/lib/data-studio/markdown-to-article";
import {
  buildF365MatchReportOpenAiPrompt,
  buildF365MatchReportRunwayPrompt,
  buildF365PreviewOpenAiPrompt,
  buildF365PreviewRunwayPrompt,
  f365HeroVarsFromArticle,
  f365PreviewVarsFromArticle,
  f365RunwayArticleHook,
  F365_MATCH_REPORT_SPEC,
  F365_PREVIEW_SPEC,
  type ArticleHeroSource,
} from "@/app/lib/language-studio/f365-text-to-image-prompts";
import { RUNWAY_T2I_PROMPT_MAX, RUNWAY_T2I_RATIOS_NEWS_SHORTS, formatRunwayT2iRatioLabel } from "@/app/lib/runway-text-to-image-constants";
import { LANGUAGE_SPORT_CONTEXTS, type LanguageSportContext } from "@/app/lib/language-studio/types";
import { studioApiPath, withAppPathPrefix } from "@/app/lib/app-base-path";
import { isSafeContentId, normalizeContentIdForFilename } from "@/app/lib/editor-content-id";

function formatClientError(e: unknown): string {
  if (e instanceof Error && e.message.trim()) return e.message;
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    const m = (e as { message: string }).message.trim();
    if (m) return m;
  }
  return "Publish failed";
}

/** Content id for saving Runway stills under images/library/{id}/ — safe for import-task API. */
function runwayImportContentId(publishArticleId: string | null | undefined): string {
  const raw = publishArticleId?.trim();
  if (raw) {
    const n = normalizeContentIdForFilename(raw);
    if (isSafeContentId(n) && n.length > 0) return n;
  }
  return `ds-runway-${Date.now().toString(36)}`;
}

function articleSportForVertical(vertical: SportVerticalId): LanguageSportContext | null {
  switch (vertical) {
    case "football":
      return "Football";
    case "horse_racing":
      return "Horse Racing";
    case "rugby_union":
      return "Rugby Union";
    case "rugby_league":
      return "Rugby League";
    case "cricket":
      return "Cricket";
    case "tennis":
      return "Tennis";
    case "f1":
      return "Formula 1";
    default:
      return null;
  }
}

type GovernanceJournalist = { id: string; name: string; brand: string; active: boolean };
type SourceBrandRow = { id: string; name: string; active: boolean };

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Side dropdown: "" = none, __custom = paste URL, else team id from Tools catalog. */
const LOOP_TEAM_CUSTOM = "__custom";

export type FixtureFetchPanelProps = {
  /** Selected hub vertical — syncs Language Studio sport tag when not "multi". */
  dataStudioVertical?: SportVerticalId;
};

export function FixtureFetchPanel({ dataStudioVertical = "football" }: FixtureFetchPanelProps) {
  const [sportId, setSportId] = useState("1");
  const [matchId, setMatchId] = useState("");
  const [presetLabel, setPresetLabel] = useState("");
  const [presets, setPresets] = useState<FixturePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown | null>(null);
  const [keyPaths, setKeyPaths] = useState<string[]>([]);
  const [tab, setTab] = useState<"paths" | "json" | "loop" | "draft">("paths");
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [includePlayerRatings, setIncludePlayerRatings] = useState(true);
  const [journalistProfiles, setJournalistProfiles] = useState<GovernanceJournalist[]>([]);
  const [sourceBrands, setSourceBrands] = useState<SourceBrandRow[]>([]);
  const [journalistProfileId, setJournalistProfileId] = useState("");
  const [sourceBrand, setSourceBrand] = useState("");
  const [articleSport, setArticleSport] = useState<LanguageSportContext>("Football");
  const [lastGeneratedMode, setLastGeneratedMode] = useState<MatchCopyMode | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishOkId, setPublishOkId] = useState<string | null>(null);

  /** Text-to-image from WP HTML draft (same Football365 prompts as Language Studio). */
  const [dataT2iProvider, setDataT2iProvider] = useState<"runway" | "openai" | "higgsfield">("openai");
  const [dataT2iPrompt, setDataT2iPrompt] = useState("");
  const [dataT2iRatio, setDataT2iRatio] = useState("1280:720");
  const [dataT2iBusy, setDataT2iBusy] = useState(false);
  const [dataT2iError, setDataT2iError] = useState<string | null>(null);
  const [dataT2iMessage, setDataT2iMessage] = useState<string | null>(null);
  const [dataT2iImageUrl, setDataT2iImageUrl] = useState<string | null>(null);
  const [dataT2iImageLibraryRel, setDataT2iImageLibraryRel] = useState<string | null>(null);
  const [dataT2iAttachBusy, setDataT2iAttachBusy] = useState(false);

  const [loopContextDate, setLoopContextDate] = useState(todayLocalIsoDate);
  const [loopHomeLabel, setLoopHomeLabel] = useState("Home");
  const [loopAwayLabel, setLoopAwayLabel] = useState("Away");
  const [loopHomeUrl, setLoopHomeUrl] = useState("");
  const [loopAwayUrl, setLoopAwayUrl] = useState("");
  const [includeLoopFeedForReports, setIncludeLoopFeedForReports] = useState(true);
  const [football365ToneBoost, setFootball365ToneBoost] = useState(false);
  const [loopFetchBusy, setLoopFetchBusy] = useState(false);
  const [loopFetchError, setLoopFetchError] = useState<string | null>(null);
  const [loopFeedSnapshot, setLoopFeedSnapshot] = useState<LoopFeedContext | null>(null);
  const [loopTeams, setLoopTeams] = useState<LoopFeedTeamRow[]>([]);
  const [loopFeedType, setLoopFeedType] = useState<LoopFeedTeamFeedType>(DEFAULT_LOOP_FEED_TEAM_FEED_TYPE);
  const [loopHomePick, setLoopHomePick] = useState("");
  const [loopAwayPick, setLoopAwayPick] = useState("");

  const loopTeamsForFeedType = useMemo(
    () => filterLoopFeedTeamsByFeedType(loopTeams, loopFeedType),
    [loopTeams, loopFeedType],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [govRes, brandRes, loopRes] = await Promise.all([
          fetch(studioApiPath("/api/language/governance")),
          fetch(studioApiPath("/api/language/source-brands")),
          fetch(studioApiPath("/api/tools/loop-feed-teams")),
        ]);
        const gov = govRes.ok ? ((await govRes.json()) as { journalistProfiles?: GovernanceJournalist[] }) : {};
        const sb = brandRes.ok ? ((await brandRes.json()) as { sourceBrands?: SourceBrandRow[] }) : {};
        const loopData = loopRes.ok ? ((await loopRes.json()) as { teams?: LoopFeedTeamRow[] }) : {};
        if (cancelled) return;
        const lt = Array.isArray(loopData.teams) ? loopData.teams.filter((t) => t.active !== false) : [];
        setLoopTeams(lt);
        const jp = Array.isArray(gov.journalistProfiles)
          ? gov.journalistProfiles.filter((p) => p.active && p.id && p.name)
          : [];
        setJournalistProfiles(jp);
        const brands = Array.isArray(sb.sourceBrands) ? sb.sourceBrands.filter((b) => b.active && b.name) : [];
        setSourceBrands(brands);
        setSourceBrand((prev) => {
          if (prev.trim()) return prev;
          const f365 = brands.find((b) => b.name.toLowerCase().includes("football365"));
          return f365?.name ?? brands[0]?.name ?? "";
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPresets(loadFixturePresets());
  }, []);

  useEffect(() => {
    if (dataStudioVertical === "multi") return;
    const sport = articleSportForVertical(dataStudioVertical);
    if (sport) setArticleSport(sport);
  }, [dataStudioVertical]);

  useEffect(() => {
    if (dataStudioVertical !== "horse_racing") return;
    if (!sourceBrands.length) return;
    setSourceBrand((prev) => {
      const lower = prev.trim().toLowerCase();
      const racing = sourceBrands.find((b) => b.name.toLowerCase().includes("racing365"));
      if (!racing) return prev;
      if (!lower || lower.includes("football365")) return racing.name;
      return prev;
    });
  }, [dataStudioVertical, sourceBrands]);

  useEffect(() => {
    setLoopHomePick("");
    setLoopAwayPick("");
  }, [loopFeedType]);

  useEffect(() => {
    if (loopHomePick === "") {
      setLoopHomeUrl("");
      setLoopHomeLabel("Home");
      return;
    }
    if (loopHomePick === LOOP_TEAM_CUSTOM) return;
    const t = loopTeamsForFeedType.find((x) => x.id === loopHomePick);
    if (t) {
      setLoopHomeUrl(t.topicUrl);
      setLoopHomeLabel(t.name);
    }
  }, [loopHomePick, loopTeamsForFeedType]);

  useEffect(() => {
    if (loopAwayPick === "") {
      setLoopAwayUrl("");
      setLoopAwayLabel("Away");
      return;
    }
    if (loopAwayPick === LOOP_TEAM_CUSTOM) return;
    const t = loopTeamsForFeedType.find((x) => x.id === loopAwayPick);
    if (t) {
      setLoopAwayUrl(t.topicUrl);
      setLoopAwayLabel(t.name);
    }
  }, [loopAwayPick, loopTeamsForFeedType]);

  const prettyJson = useMemo(() => {
    if (payload === null) return "";
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }, [payload]);

  const prettyLoopJson = useMemo(() => {
    if (!loopFeedSnapshot) return "";
    try {
      return JSON.stringify(loopFeedSnapshot, null, 2);
    } catch {
      return String(loopFeedSnapshot);
    }
  }, [loopFeedSnapshot]);

  /** Parsed draft → same shape Language Studio uses for Football365 image prompts. */
  const draftArticleHeroSource = useMemo((): ArticleHeroSource | null => {
    if (!draftMarkdown.trim()) return null;
    const split = splitArticleForLanguageStudio(draftMarkdown);
    const category =
      lastGeneratedMode === "preview"
        ? "Match preview"
        : lastGeneratedMode === "report"
          ? "Match report"
          : lastGeneratedMode === "sixteen_conclusions"
            ? "16 conclusions"
            : undefined;
    const tags =
      lastGeneratedMode === "sixteen_conclusions"
        ? ["16-conclusions"]
        : lastGeneratedMode === "preview"
          ? ["preview"]
          : [];
    return {
      title: split.title,
      body: split.body,
      standfirst: split.standfirst,
      category,
      tags,
    };
  }, [draftMarkdown, lastGeneratedMode]);

  const fetchFixture = useCallback(async () => {
    const mid = matchId.trim();
    const sid = sportId.trim() || "1";
    if (!mid) {
      setError("Enter a match ID.");
      return;
    }
    setLoading(true);
    setError(null);
    setPayload(null);
    setKeyPaths([]);
    try {
      const qs = new URLSearchParams({ sport_id: sid, match_id: mid });
      const res = await fetch(`${studioApiPath("/api/data-studio/fixture")}?${qs.toString()}`, { method: "GET" });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        payload?: unknown;
        keyPaths?: string[];
      };
      if (!res.ok || body.ok === false) {
        setError(body.error || `Request failed (${res.status})`);
        return;
      }
      setPayload(body.payload ?? null);
      setKeyPaths(Array.isArray(body.keyPaths) ? body.keyPaths : []);
      setTab("paths");
      setDraftMarkdown("");
      setLastGeneratedMode(null);
      setPublishOkId(null);
      setPublishError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [matchId, sportId]);

  const applyPreset = useCallback((id: string) => {
    const row = presets.find((p) => p.id === id);
    if (!row) return;
    setSportId(row.sport_id);
    setMatchId(row.match_id);
    setLoopHomeUrl(row.loop_home_url ?? "");
    setLoopAwayUrl(row.loop_away_url ?? "");
    setLoopHomeLabel(row.loop_home_label?.trim() ? row.loop_home_label : "Home");
    setLoopAwayLabel(row.loop_away_label?.trim() ? row.loop_away_label : "Away");
    if (row.loop_home_team_id?.trim()) setLoopHomePick(row.loop_home_team_id.trim());
    else if (row.loop_home_url?.trim()) setLoopHomePick(LOOP_TEAM_CUSTOM);
    else setLoopHomePick("");
    if (row.loop_away_team_id?.trim()) setLoopAwayPick(row.loop_away_team_id.trim());
    else if (row.loop_away_url?.trim()) setLoopAwayPick(LOOP_TEAM_CUSTOM);
    else setLoopAwayPick("");
  }, [presets]);

  const savePreset = useCallback(() => {
    const label = presetLabel.trim();
    const mid = matchId.trim();
    const sid = sportId.trim() || "1";
    if (!label || !mid) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p-${Date.now()}`;
    const row: FixturePreset = { id, label, sport_id: sid, match_id: mid };
    if (loopHomePick && loopHomePick !== LOOP_TEAM_CUSTOM) row.loop_home_team_id = loopHomePick;
    if (loopAwayPick && loopAwayPick !== LOOP_TEAM_CUSTOM) row.loop_away_team_id = loopAwayPick;
    if (loopHomeUrl.trim()) {
      row.loop_home_url = loopHomeUrl.trim();
      if (loopHomeLabel.trim()) row.loop_home_label = loopHomeLabel.trim();
    }
    if (loopAwayUrl.trim()) {
      row.loop_away_url = loopAwayUrl.trim();
      if (loopAwayLabel.trim()) row.loop_away_label = loopAwayLabel.trim();
    }
    const next = [...presets, row];
    setPresets(next);
    saveFixturePresets(next);
    setPresetLabel("");
  }, [
    presetLabel,
    matchId,
    sportId,
    presets,
    loopHomeUrl,
    loopAwayUrl,
    loopHomeLabel,
    loopAwayLabel,
    loopHomePick,
    loopAwayPick,
  ]);

  const removePreset = useCallback(
    (id: string) => {
      const next = presets.filter((p) => p.id !== id);
      setPresets(next);
      saveFixturePresets(next);
    },
    [presets],
  );

  const copyJson = useCallback(async () => {
    if (!prettyJson) return;
    await navigator.clipboard.writeText(prettyJson);
  }, [prettyJson]);

  const copyDraft = useCallback(async () => {
    if (!draftMarkdown) return;
    await navigator.clipboard.writeText(draftMarkdown);
  }, [draftMarkdown]);

  const copyLoopJson = useCallback(async () => {
    if (!prettyLoopJson) return;
    await navigator.clipboard.writeText(prettyLoopJson);
  }, [prettyLoopJson]);

  const fetchLoopFeedSnapshot = useCallback(async (): Promise<LoopFeedContext> => {
    const sides: { sideLabel: string; url: string }[] = [];
    const hu = loopHomeUrl.trim();
    const au = loopAwayUrl.trim();
    if (hu) sides.push({ sideLabel: loopHomeLabel.trim() || "Home", url: hu });
    if (au) sides.push({ sideLabel: loopAwayLabel.trim() || "Away", url: au });
    const res = await fetch(studioApiPath("/api/data-studio/loop-feed"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextDate: loopContextDate, sides }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string; loopFeed?: LoopFeedContext };
    if (!res.ok || body.ok === false || !body.loopFeed) {
      throw new Error(body.error || `Loop Feed failed (${res.status})`);
    }
    return body.loopFeed;
  }, [loopAwayLabel, loopAwayUrl, loopContextDate, loopHomeLabel, loopHomeUrl]);

  const loadLoopFeed = useCallback(async () => {
    if (!loopHomeUrl.trim() && !loopAwayUrl.trim()) {
      setLoopFetchError(
        "Choose Side A / Side B from the Loop team list, pick “Custom URL…”, or add feeds under Tools → Loop Feed teams.",
      );
      return;
    }
    setLoopFetchBusy(true);
    setLoopFetchError(null);
    try {
      const snap = await fetchLoopFeedSnapshot();
      setLoopFeedSnapshot(snap);
    } catch (e) {
      setLoopFeedSnapshot(null);
      setLoopFetchError(e instanceof Error ? e.message : "Loop Feed fetch failed.");
    } finally {
      setLoopFetchBusy(false);
    }
  }, [fetchLoopFeedSnapshot, loopAwayUrl, loopHomeUrl]);

  const generateAi = useCallback(
    async (mode: MatchCopyMode) => {
      if (payload === null || typeof payload !== "object") return;
      setAiLoading(true);
      setAiError(null);
      try {
        let loopFeedContext: LoopFeedContext | undefined;
        if (
          (mode === "report" || mode === "sixteen_conclusions") &&
          includeLoopFeedForReports &&
          (loopHomeUrl.trim() || loopAwayUrl.trim())
        ) {
          loopFeedContext = await fetchLoopFeedSnapshot();
          setLoopFeedSnapshot(loopFeedContext);
          setLoopFetchError(null);
        }

        const res = await fetch(studioApiPath("/api/data-studio/match-copy"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            fixturePayload: payload,
            includePlayerRatings: mode === "report" ? includePlayerRatings : undefined,
            journalistProfileId: journalistProfileId.trim() || undefined,
            sportVertical: dataStudioVertical,
            football365ToneBoost,
            ...(loopFeedContext ? { loopFeedContext } : {}),
          }),
        });
        const body = (await res.json()) as { ok?: boolean; error?: string; markdown?: string };
        if (!res.ok || body.ok === false) {
          setAiError(body.error || `Request failed (${res.status})`);
          return;
        }
        const md = typeof body.markdown === "string" ? body.markdown : "";
        setDraftMarkdown(md);
        setLastGeneratedMode(mode);
        setPublishOkId(null);
        setPublishError(null);
        setDataT2iImageUrl(null);
        setDataT2iImageLibraryRel(null);
        setDataT2iError(null);
        setDataT2iMessage(null);
        setTab("draft");
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setAiLoading(false);
      }
    },
    [
      payload,
      includePlayerRatings,
      journalistProfileId,
      includeLoopFeedForReports,
      loopAwayUrl,
      loopHomeUrl,
      fetchLoopFeedSnapshot,
      dataStudioVertical,
      football365ToneBoost,
    ],
  );

  const publishToLanguageStudio = useCallback(async () => {
    const brand = sourceBrand.trim();
    if (!draftMarkdown.trim()) return;
    if (!brand) {
      setPublishError("Choose a source brand (or type one if your list is empty).");
      return;
    }
    setPublishLoading(true);
    setPublishError(null);
    setPublishOkId(null);
    try {
      const res = await fetch(studioApiPath("/api/data-studio/language-publish"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: draftMarkdown,
          mode: lastGeneratedMode ?? "report",
          sourceBrand: brand,
          sport: articleSport,
          journalistProfileId: journalistProfileId.trim() || undefined,
          sport_id: sportId.trim() || "1",
          match_id: matchId.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; articleId?: string };
      if (!res.ok || body.ok === false) {
        setPublishError(body.error || `Publish failed (${res.status})`);
        return;
      }
      if (body.articleId) {
        setPublishOkId(body.articleId);
        /** Full navigation avoids intermittent client-transition runtime errors (e.g. `[object Event]` overlay) after publish. */
        const href = `/language-studio?tab=Rewrite&articleId=${encodeURIComponent(body.articleId)}`;
        window.location.assign(withAppPathPrefix(href));
      }
    } catch (e) {
      console.error(e);
      setPublishError(formatClientError(e));
    } finally {
      setPublishLoading(false);
    }
  }, [
    draftMarkdown,
    sourceBrand,
    lastGeneratedMode,
    articleSport,
    journalistProfileId,
    sportId,
    matchId,
  ]);

  const applyDataF365MatchReportPrompt = useCallback(() => {
    if (!draftArticleHeroSource) return;
    const v = f365HeroVarsFromArticle(draftArticleHeroSource);
    const snip = { standfirst: draftArticleHeroSource.standfirst, body: draftArticleHeroSource.body };
    setDataT2iPrompt(
      dataT2iProvider === "openai" || dataT2iProvider === "higgsfield"
        ? buildF365MatchReportOpenAiPrompt(v, snip)
        : buildF365MatchReportRunwayPrompt(v, { narrativeHook: f365RunwayArticleHook(snip) }),
    );
    setDataT2iRatio("1280:720");
    setDataT2iError(null);
    setDataT2iMessage(
      dataT2iProvider === "openai"
        ? "Football365 full-time hero prompt filled from draft (OpenAI long brief)."
        : dataT2iProvider === "higgsfield"
          ? "Football365 full-time hero prompt filled from draft (Higgsfield — OpenAI-style long brief)."
          : "Football365 full-time hero Runway prompt filled from draft (compact + hook).",
    );
  }, [draftArticleHeroSource, dataT2iProvider]);

  const applyDataF365PreviewPrompt = useCallback(() => {
    if (!draftArticleHeroSource) return;
    const pv = f365PreviewVarsFromArticle(draftArticleHeroSource);
    const snip = { standfirst: draftArticleHeroSource.standfirst, body: draftArticleHeroSource.body };
    setDataT2iPrompt(
      dataT2iProvider === "openai" || dataT2iProvider === "higgsfield"
        ? buildF365PreviewOpenAiPrompt(pv, snip)
        : buildF365PreviewRunwayPrompt(pv, { narrativeHook: f365RunwayArticleHook(snip) }),
    );
    setDataT2iRatio("1280:720");
    setDataT2iError(null);
    setDataT2iMessage(
      dataT2iProvider === "openai"
        ? "Preview / thumbnail prompt filled from draft (OpenAI long brief)."
        : dataT2iProvider === "higgsfield"
          ? "Preview / thumbnail prompt filled from draft (Higgsfield — OpenAI-style long brief)."
          : "Preview Runway prompt filled from draft.",
    );
  }, [draftArticleHeroSource, dataT2iProvider]);

  const copyDataT2iPrompt = useCallback(async () => {
    if (!dataT2iPrompt.trim()) return;
    await navigator.clipboard.writeText(dataT2iPrompt);
    setDataT2iMessage("Prompt copied to clipboard.");
    setDataT2iError(null);
  }, [dataT2iPrompt]);

  const runDataStudioTextToImage = useCallback(async () => {
    const promptText = dataT2iPrompt.trim();
    if (!promptText) {
      setDataT2iError("Fill the prompt first (use Match report or Preview hero, or paste your own).");
      return;
    }
    setDataT2iBusy(true);
    setDataT2iError(null);
    setDataT2iMessage(null);
    setDataT2iImageUrl(null);
    setDataT2iImageLibraryRel(null);
    try {
      if (dataT2iProvider === "openai") {
        const res = await fetch(studioApiPath("/api/openai/text-to-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            size: "1792x1024",
            quality: "standard",
          }),
        });
        const data = (await res.json()) as { error?: string; imageUrl?: string; imageLibraryRel?: string };
        if (!res.ok || !data.imageUrl) throw new Error(data.error || "OpenAI image generation failed.");
        setDataT2iImageUrl(data.imageUrl);
        setDataT2iImageLibraryRel(data.imageLibraryRel?.trim() ? data.imageLibraryRel.trim() : null);
        setDataT2iMessage(
          publishOkId
            ? "OpenAI image ready — attach to the saved article below or copy the URL."
            : "OpenAI image ready — copy URL, or use Send to Article Studio then attach from here.",
        );
        return;
      }

      if (dataT2iProvider === "higgsfield") {
        const res = await fetch(studioApiPath("/api/higgsfield/text-to-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            aspectRatio: "16:9",
          }),
        });
        const data = (await res.json()) as { error?: string; imageUrl?: string; imageLibraryRel?: string; ok?: boolean };
        if (!res.ok || !data.imageUrl) throw new Error(data.error || "Higgsfield image generation failed.");
        setDataT2iImageUrl(data.imageUrl);
        setDataT2iImageLibraryRel(data.imageLibraryRel?.trim() ? data.imageLibraryRel.trim() : null);
        setDataT2iMessage(
          publishOkId
            ? "Higgsfield image ready — attach to the saved article below or copy the URL."
            : "Higgsfield image ready — copy URL, or use Send to Article Studio then attach from here.",
        );
        return;
      }

      if (promptText.length > RUNWAY_T2I_PROMPT_MAX) {
        throw new Error(
          `Runway allows at most ${RUNWAY_T2I_PROMPT_MAX} characters (this prompt is ${promptText.length}). Choose Runway above and click Match report hero or Preview hero again for a compact prompt — or switch to OpenAI or Higgsfield for the long Football365 brief.`,
        );
      }
      const startRes = await fetch(studioApiPath("/api/runway/text-to-image"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText,
          ratio: dataT2iRatio,
        }),
      });
      const startData = (await startRes.json()) as { error?: string; taskId?: string };
      if (!startRes.ok) throw new Error(startData.error || "Runway Text to Image failed.");
      const taskId = typeof startData.taskId === "string" ? startData.taskId.trim() : "";
      if (!taskId) throw new Error("Runway did not return a task id.");

      const contentId = runwayImportContentId(publishOkId);
      setDataT2iMessage(`Runway started (${dataT2iRatio}). Task: ${taskId} — waiting for image…`);

      const maxAttempts = 45;
      const delayMs = 3000;
      let lastNote = "";
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, delayMs));
        const impRes = await fetch(studioApiPath("/api/runway/import-task"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, taskId, assetKind: "image" }),
        });
        const impData = (await impRes.json()) as {
          ok?: boolean;
          error?: string;
          backgroundImageRel?: string;
          status?: string;
          message?: string;
        };
        if (impRes.ok && typeof impData.backgroundImageRel === "string" && impData.backgroundImageRel.trim()) {
          const rel = impData.backgroundImageRel.trim();
          setDataT2iImageUrl(withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}`));
          setDataT2iImageLibraryRel(rel);
          setDataT2iMessage(`Runway image ready (task ${taskId}) — thumbnail below. Saved under images/library/${contentId}/.`);
          return;
        }
        if (impRes.status === 409) {
          const st = typeof impData.status === "string" ? impData.status : "processing";
          lastNote = st;
          setDataT2iMessage(`Runway processing… (${st}). Task: ${taskId}`);
          continue;
        }
        throw new Error(impData.error || `Runway import failed (${impRes.status}).`);
      }
      const approxMin = Math.round((maxAttempts * delayMs) / 6000) / 10;
      throw new Error(
        lastNote
          ? `Runway task did not finish within ~${approxMin} min (last status: ${lastNote}).`
          : `Runway task did not finish within ~${approxMin} min.`,
      );
    } catch (e) {
      setDataT2iError(e instanceof Error ? e.message : "Text to image failed.");
    } finally {
      setDataT2iBusy(false);
    }
  }, [dataT2iPrompt, dataT2iProvider, dataT2iRatio, publishOkId]);

  const attachDataT2iImageToPublishedArticle = useCallback(async () => {
    const url = dataT2iImageUrl?.trim();
    const libRel = dataT2iImageLibraryRel?.trim();
    const id = publishOkId?.trim();
    if (!url || !id) return;
    setDataT2iAttachBusy(true);
    setDataT2iError(null);
    try {
      const res = await fetch(studioApiPath("/api/language/articles/image"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: id,
          action: "change",
          imageUrl: url,
          ...(libRel ? { imageLibraryRel: libRel } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not attach image to article.");
      setDataT2iMessage("Image attached to this draft’s saved article. Open Article Studio → Review Queue for Source Image.");
    } catch (e) {
      setDataT2iError(e instanceof Error ? e.message : "Attach failed.");
    } finally {
      setDataT2iAttachBusy(false);
    }
  }, [dataT2iImageUrl, dataT2iImageLibraryRel, publishOkId]);

  const matchIdPlaceholder =
    dataStudioVertical === "horse_racing" ? "Race / fixture ID from provider" : "e.g. 2990360";

  return (
    <Panel title="Fixture feed (SixLogics SportccFixture)">
      <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
        Server-side proxy reads <strong className="text-[color:var(--text-primary)]">SIXLOGICS_USER_ID</strong> and{" "}
        <strong className="text-[color:var(--text-primary)]">SIXLOGICS_PASS</strong> from{" "}
        <code className="text-[color:var(--text-muted)]">.env.local</code> — credentials never touch the browser. Optional{" "}
        <code className="text-[color:var(--text-muted)]">SIXLOGICS_FIXTURE_BASE</code> defaults to the public API host.
        {dataStudioVertical === "horse_racing" ? (
          <>
            {" "}
            For racing, set <strong className="text-[color:var(--text-primary)]">Sport ID</strong> to your provider’s horse
            racing code when it differs from football&apos;s <code className="text-[color:var(--text-muted)]">1</code>.
          </>
        ) : null}
      </p>

      <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
        <p className="text-sm font-bold text-[color:var(--text-primary)]">Loop Feed — team social (match day)</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
          Pick two clubs from your saved catalog (or use custom URLs). Manage topic URLs in{" "}
          <Link href={LOOP_FEED_TEAMS_PATH} className="font-semibold text-[#22c55e] hover:underline">
            Configure → Loop Feed teams
          </Link>
          . Fetched server-side; set <code className="text-[color:var(--text-muted)]">LOOP_FEED_AUTHORIZATION</code> in{" "}
          <code className="text-[color:var(--text-muted)]">.env.local</code> if required. Posts match the calendar date below in{" "}
          <code className="text-[color:var(--text-muted)]">LOOP_FEED_DAY_TZ</code> (default Europe/London).
        </p>
        <label className="mt-3 flex max-w-md flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Feed type
          <select
            value={loopFeedType}
            onChange={(e) => setLoopFeedType(e.target.value as LoopFeedTeamFeedType)}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {LOOP_FEED_TEAM_FEED_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">{loopFeedTeamFeedTypeDescription(loopFeedType)}</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Side A
              <select
                value={loopHomePick}
                onChange={(e) => setLoopHomePick(e.target.value)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">— None —</option>
                <option value={LOOP_TEAM_CUSTOM}>Custom URL…</option>
                {loopTeamsForFeedType.map((t) => (
                  <option key={t.id} value={t.id}>
                    {loopFeedTeamDisplayName(t.name, t.feedType)}
                  </option>
                ))}
              </select>
            </label>
            {loopHomePick === LOOP_TEAM_CUSTOM ? (
              <>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Display label (optional)
                  <input
                    value={loopHomeLabel}
                    onChange={(e) => setLoopHomeLabel(e.target.value)}
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Topic content URL
                  <input
                    value={loopHomeUrl}
                    onChange={(e) => setLoopHomeUrl(e.target.value)}
                    placeholder="https://q.loop-feed.com/v1/topic/…/content"
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-[11px] text-[color:var(--text-primary)]"
                  />
                </label>
              </>
            ) : loopHomePick ? (
              <p className="break-all font-mono text-[11px] leading-relaxed text-[color:var(--text-muted)]">{loopHomeUrl}</p>
            ) : null}
          </div>
          <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Side B
              <select
                value={loopAwayPick}
                onChange={(e) => setLoopAwayPick(e.target.value)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">— None —</option>
                <option value={LOOP_TEAM_CUSTOM}>Custom URL…</option>
                {loopTeamsForFeedType.map((t) => (
                  <option key={t.id} value={t.id}>
                    {loopFeedTeamDisplayName(t.name, t.feedType)}
                  </option>
                ))}
              </select>
            </label>
            {loopAwayPick === LOOP_TEAM_CUSTOM ? (
              <>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Display label (optional)
                  <input
                    value={loopAwayLabel}
                    onChange={(e) => setLoopAwayLabel(e.target.value)}
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
                  Topic content URL
                  <input
                    value={loopAwayUrl}
                    onChange={(e) => setLoopAwayUrl(e.target.value)}
                    placeholder="https://q.loop-feed.com/v1/topic/…/content"
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-[11px] text-[color:var(--text-primary)]"
                  />
                </label>
              </>
            ) : loopAwayPick ? (
              <p className="break-all font-mono text-[11px] leading-relaxed text-[color:var(--text-muted)]">{loopAwayUrl}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Match-day filter (calendar date in{" "}
            <code className="text-[color:var(--text-muted)]">LOOP_FEED_DAY_TZ</code>, default Europe/London)
            <input
              type="date"
              value={loopContextDate}
              onChange={(e) => setLoopContextDate(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <R365Button type="button" variant="ghost" onClick={() => void loadLoopFeed()} disabled={loopFetchBusy || aiLoading}>
            {loopFetchBusy ? "Fetching Loop…" : "Fetch Loop Feed"}
          </R365Button>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[color:var(--text-secondary)]">
            <input
              type="checkbox"
              checked={includeLoopFeedForReports}
              onChange={(e) => setIncludeLoopFeedForReports(e.target.checked)}
              className="rounded border-[color:var(--border)]"
            />
            Attach Loop Feed before <strong className="text-[color:var(--text-primary)]">Generate report</strong> or{" "}
            <strong className="text-[color:var(--text-primary)]">16 conclusions</strong>
          </label>
        </div>
        {loopFetchError ? (
          <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{loopFetchError}</p>
        ) : null}
        {loopFeedSnapshot?.sides?.length ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs leading-5 text-[color:var(--text-muted)]">
              Last snapshot ({loopFeedSnapshot.contextDate}):{" "}
              {loopFeedSnapshot.sides
                .map((s) => `${s.sideLabel}: ${s.posts.length} posts${s.error ? ` — ${s.error}` : ""}`)
                .join(" · ")}{" "}
              — this JSON is sent with <strong className="text-[color:var(--text-secondary)]">Generate report</strong> /{" "}
              <strong className="text-[color:var(--text-secondary)]">16 conclusions</strong> when the checkbox above is on.
            </p>
            <details className="rounded-lg border border-[color:var(--border)] bg-black/20 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[color:var(--text-primary)]">
                View LOOP_FEED_JSON (last fetch)
              </summary>
              <pre className="mt-2 max-h-[min(320px,40vh)] overflow-auto font-mono text-[10px] leading-relaxed text-[color:var(--text-secondary)]">
                {prettyLoopJson}
              </pre>
            </details>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Sport ID
          <input
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            inputMode="numeric"
            className="w-24 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Match ID
          <input
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            inputMode="numeric"
            placeholder={matchIdPlaceholder}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <R365Button type="button" onClick={() => void fetchFixture()} disabled={loading}>
          {loading ? "Fetching…" : "Fetch fixture"}
        </R365Button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[color:var(--border)] pt-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Saved presets (this browser)
          <select
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            value=""
            onChange={(e) => {
              applyPreset(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Load preset…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} · sport {p.sport_id} · match {p.match_id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
          Label for new preset
          <input
            value={presetLabel}
            onChange={(e) => setPresetLabel(e.target.value)}
            placeholder="e.g. PL Man Utd vs Forest"
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </label>
        <R365Button type="button" variant="ghost" onClick={savePreset} disabled={!presetLabel.trim() || !matchId.trim()}>
          Save preset
        </R365Button>
      </div>

      {presets.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
          {presets.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1 rounded-full border border-[color:var(--border)] px-2 py-1"
            >
              <button type="button" className="font-semibold text-[#22c55e] hover:underline" onClick={() => applyPreset(p.id)}>
                {p.label}
              </button>
              <button
                type="button"
                className="text-[color:var(--text-muted)] hover:text-red-400"
                aria-label={`Remove ${p.label}`}
                onClick={() => removePreset(p.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      {payload !== null ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("paths")}
              className={
                tab === "paths"
                  ? "rounded-full border border-sky-500/50 bg-sky-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-100"
                  : "rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]"
              }
            >
              Key paths
            </button>
            <button
              type="button"
              onClick={() => setTab("json")}
              className={
                tab === "json"
                  ? "rounded-full border border-sky-500/50 bg-sky-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-100"
                  : "rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]"
              }
            >
              Raw JSON
            </button>
            <button
              type="button"
              onClick={() => setTab("loop")}
              className={
                tab === "loop"
                  ? "rounded-full border border-violet-500/50 bg-violet-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-violet-100"
                  : "rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]"
              }
            >
              Loop feed
              {loopFeedSnapshot?.sides?.some((s) => s.posts.length > 0) ? (
                <span className="ml-1 rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold">
                  {loopFeedSnapshot.sides.reduce((n, s) => n + s.posts.length, 0)}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("draft")}
              className={
                tab === "draft"
                  ? "rounded-full border border-amber-500/50 bg-amber-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-100"
                  : "rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]"
              }
            >
              WP HTML draft
            </button>
            <R365Button type="button" variant="ghost" onClick={() => void copyJson()} disabled={!prettyJson}>
              Copy JSON
            </R365Button>
            <R365Button type="button" variant="ghost" onClick={() => void copyLoopJson()} disabled={!prettyLoopJson}>
              Copy Loop JSON
            </R365Button>
          </div>

          <div className="grid gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Content creator style (optional)
              <select
                value={journalistProfileId}
                onChange={(e) => setJournalistProfileId(e.target.value)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">Default (no profile)</option>
                {journalistProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.brand}
                  </option>
                ))}
              </select>
              <span className="font-normal text-[color:var(--text-muted)]">
                Applied when generating and sets author when publishing.
              </span>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Source brand (Article Studio)
              {sourceBrands.length > 0 ? (
                <select
                  value={sourceBrand}
                  onChange={(e) => setSourceBrand(e.target.value)}
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                >
                  {sourceBrands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={sourceBrand}
                  onChange={(e) => setSourceBrand(e.target.value)}
                  placeholder="e.g. Football365"
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              )}
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Article sport tag
              <select
                value={articleSport}
                onChange={(e) => setArticleSport(e.target.value as LanguageSportContext)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                {LANGUAGE_SPORT_CONTEXTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              AI from feed
            </span>
            <R365Button type="button" onClick={() => void generateAi("preview")} disabled={aiLoading}>
              {aiLoading ? "Working…" : "Generate preview"}
            </R365Button>
            <R365Button type="button" onClick={() => void generateAi("report")} disabled={aiLoading}>
              {aiLoading ? "Working…" : "Generate report"}
            </R365Button>
            <R365Button type="button" onClick={() => void generateAi("sixteen_conclusions")} disabled={aiLoading}>
              {aiLoading ? "Working…" : "16 conclusions"}
            </R365Button>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[color:var(--text-secondary)]">
              <input
                type="checkbox"
                checked={football365ToneBoost}
                onChange={(e) => setFootball365ToneBoost(e.target.checked)}
                className="rounded border-[color:var(--border)]"
              />
              Football365 tone cues (comma-hook headlines — optional)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[color:var(--text-secondary)]">
              <input
                type="checkbox"
                checked={includePlayerRatings}
                onChange={(e) => setIncludePlayerRatings(e.target.checked)}
                className="rounded border-[color:var(--border)]"
              />
              Include player ratings — both teams (reports only)
            </label>
          </div>

          {aiError ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{aiError}</p>
          ) : null}

          {tab === "paths" ? (
            <div className="rounded-xl border border-[color:var(--border)] bg-black/25 p-3">
              <p className="mb-2 text-xs text-[color:var(--text-muted)]">
                Sample dot-paths for mapping to Football365 widgets (trimmed list). Cross-check with the matrix below.
              </p>
              <div className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
                {keyPaths.length ? (
                  keyPaths.map((k) => (
                    <div key={k} className="border-b border-[color:var(--border)]/40 py-0.5">
                      {k}
                    </div>
                  ))
                ) : (
                  <span className="text-[color:var(--text-muted)]">No paths extracted (non-object payload).</span>
                )}
              </div>
            </div>
          ) : tab === "json" ? (
            <pre className="max-h-[min(480px,55vh)] overflow-auto rounded-xl border border-[color:var(--border)] bg-black/40 p-3 text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
              {prettyJson}
            </pre>
          ) : tab === "loop" ? (
            <div className="space-y-3 rounded-xl border border-[color:var(--border)] bg-black/25 p-4">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Same payload sent to the model as <strong className="text-[color:var(--text-primary)]">LOOP_FEED_JSON</strong> when you run{" "}
                <strong className="text-[color:var(--text-primary)]">Generate report</strong> (with Loop attach enabled). Fetch Loop Feed above if this is empty.
              </p>
              {prettyLoopJson ? (
                <pre className="max-h-[min(480px,55vh)] overflow-auto rounded-xl border border-[color:var(--border)] bg-black/40 p-3 text-[11px] leading-relaxed text-[color:var(--text-secondary)]">
                  {prettyLoopJson}
                </pre>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">No Loop snapshot yet — choose Side A/B and click Fetch Loop Feed.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <R365Button type="button" variant="ghost" onClick={() => void copyDraft()} disabled={!draftMarkdown}>
                  Copy HTML
                </R365Button>
                <R365Button
                  type="button"
                  onClick={() => void publishToLanguageStudio()}
                  disabled={!draftMarkdown.trim() || publishLoading || aiLoading}
                >
                  {publishLoading ? "Saving…" : "Send to Article Studio"}
                </R365Button>
                <Link
                  href={
                    publishOkId
                      ? `/language-studio?tab=Rewrite&articleId=${encodeURIComponent(publishOkId)}`
                      : "/language-studio?tab=Rewrite"
                  }
                  className="inline-flex items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-hover)]"
                >
                  Open Rewrite queue
                </Link>
              </div>
              {!publishOkId ? (
                <p className="text-xs text-[color:var(--text-muted)]">
                  <strong className="text-[color:var(--text-secondary)]">Send to Article Studio</strong> saves this draft as an imported article and opens Rewrite with it selected (needs source brand above).
                </p>
              ) : null}
              {publishError ? (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{publishError}</p>
              ) : null}
              {publishOkId ? (
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Saved — heading to{" "}
                  <Link
                    href={`/language-studio?tab=Rewrite&articleId=${encodeURIComponent(publishOkId)}`}
                    className="font-semibold text-[#22c55e] hover:underline"
                  >
                    Article Studio → Rewrite
                  </Link>
                  . Run <strong className="text-[color:var(--text-primary)]">Rewrite</strong> or{" "}
                  <strong className="text-[color:var(--text-primary)]">Translate</strong> from there;{" "}
                  <strong className="text-[color:var(--text-primary)]">Review Queue</strong> lists jobs after you start them. Article id:{" "}
                  <code className="text-[color:var(--text-muted)]">{publishOkId}</code>
                </p>
              ) : null}
              {draftMarkdown.trim() ? (
                <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-sky-200">Text to image — Football365 prompts</p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                      Builds the same Runway / OpenAI prompts as Language Studio from this draft&apos;s title and HTML body.
                      Generate an image here, then attach it after <strong className="text-[color:var(--text-primary)]">Send to Article Studio</strong> using the button below (or copy the URL).
                    </p>
                    {dataStudioVertical !== "football" ? (
                      <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100">
                        Sport vertical is not <strong className="text-[color:var(--text-primary)]">Football</strong> — fixture parsing may be weaker; select Football above for match cards.
                      </p>
                    ) : null}
                  </div>
                  <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                    Provider
                    <select
                      value={dataT2iProvider}
                      onChange={(e) => setDataT2iProvider(e.target.value as "runway" | "openai" | "higgsfield")}
                      className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    >
                      <option value="openai">OpenAI Images (default gpt-image-1 — saved to library)</option>
                      <option value="runway">Runway Gen-4 (poll + save + thumbnail)</option>
                      <option value="higgsfield">Higgsfield (prompt-only — Seedream v4 by default)</option>
                    </select>
                  </label>
                  {dataT2iProvider === "runway" ? (
                    <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                      Runway ratio
                      <select
                        value={dataT2iRatio}
                        onChange={(e) => setDataT2iRatio(e.target.value)}
                        className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      >
                        {RUNWAY_T2I_RATIOS_NEWS_SHORTS.map((r) => (
                          <option key={r} value={r}>
                            {formatRunwayT2iRatioLabel(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : dataT2iProvider === "openai" ? (
                    <p className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-2 text-xs text-[color:var(--text-secondary)]">
                      Model defaults to <strong className="text-[color:var(--text-primary)]">gpt-image-1</strong> (set{" "}
                      <code className="text-[color:var(--text-muted)]">OPENAI_IMAGE_MODEL</code> or Admin → OpenAI image model).
                      Outputs are saved under <code className="text-[color:var(--text-muted)]">images/library/openai-t2i/</code>.
                    </p>
                  ) : (
                    <p className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-2 text-xs text-[color:var(--text-secondary)]">
                      Uses Higgsfield <strong className="text-[color:var(--text-primary)]">prompt-only</strong> generation (default path{" "}
                      <code className="text-[color:var(--text-muted)]">bytedance/seedream/v4/text-to-image</code>). Set{" "}
                      <code className="text-[color:var(--text-muted)]">HIGGSFIELD_TEXT_TO_IMAGE_ENDPOINT</code> to another platform path if needed.
                      Requires HF credentials (Admin → Higgsfield). Images save next to other Higgsfield outputs in the library.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <R365Button type="button" variant="ghost" disabled={!draftArticleHeroSource} onClick={applyDataF365MatchReportPrompt}>
                      Football365
                    </R365Button>
                    <R365Button type="button" variant="ghost" disabled={!draftArticleHeroSource} onClick={applyDataF365PreviewPrompt}>
                      Preview hero
                    </R365Button>
                    <R365Button type="button" variant="ghost" disabled={!dataT2iPrompt.trim()} onClick={() => void copyDataT2iPrompt()}>
                      Copy prompt
                    </R365Button>
                    <R365Button type="button" onClick={() => void runDataStudioTextToImage()} disabled={dataT2iBusy || !dataT2iPrompt.trim()}>
                      {dataT2iBusy ? "Generating…" : "Text to Image +"}
                    </R365Button>
                  </div>
                  <label className="block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                    Image prompt
                    <textarea
                      value={dataT2iPrompt}
                      onChange={(e) => setDataT2iPrompt(e.target.value)}
                      placeholder="Apply Match report or Preview hero, or paste a custom prompt…"
                      rows={6}
                      className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 font-mono text-xs leading-relaxed text-[color:var(--text-primary)]"
                    />
                  </label>
                  {dataT2iProvider === "runway" && dataT2iPrompt.length > RUNWAY_T2I_PROMPT_MAX ? (
                    <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      Prompt is {dataT2iPrompt.length} characters; Runway allows {RUNWAY_T2I_PROMPT_MAX}. Select Runway and re-apply{" "}
                      <strong className="text-[color:var(--text-primary)]">Match report hero</strong> or{" "}
                      <strong className="text-[color:var(--text-primary)]">Preview hero</strong>, or use OpenAI / Higgsfield for the long brief.
                    </p>
                  ) : null}
                  {dataT2iError ? (
                    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{dataT2iError}</p>
                  ) : null}
                  {dataT2iMessage ? (
                    <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">{dataT2iMessage}</p>
                  ) : null}
                  {dataT2iImageUrl ? (
                    <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-black/30 p-3">
                      <p className="text-xs font-semibold text-[color:var(--text-primary)]">Generated image — thumbnail preview</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          dataT2iImageLibraryRel?.trim()
                            ? withAppPathPrefix(`/api/file?rel=${encodeURIComponent(dataT2iImageLibraryRel.trim())}`)
                            : dataT2iImageUrl
                        }
                        alt=""
                        className="aspect-video w-full max-h-64 rounded-lg border border-[color:var(--border)] bg-black/40 object-contain shadow-inner"
                      />
                      {dataT2iImageLibraryRel ? (
                        <p className="break-all font-mono text-[10px] text-[color:var(--text-muted)]">
                          Library path: <code className="text-[color:var(--text-secondary)]">{dataT2iImageLibraryRel}</code>
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <R365Button
                          type="button"
                          variant="ghost"
                          onClick={() => void navigator.clipboard.writeText(dataT2iImageUrl)}
                        >
                          Copy image URL
                        </R365Button>
                        {publishOkId ? (
                          <R365Button
                            type="button"
                            onClick={() => void attachDataT2iImageToPublishedArticle()}
                            disabled={dataT2iAttachBusy}
                          >
                            {dataT2iAttachBusy ? "Attaching…" : "Attach to saved article"}
                          </R365Button>
                        ) : (
                          <span className="self-center text-xs text-[color:var(--text-muted)]">
                            Send draft to Language Studio first to enable one-click attach.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <details className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-2 text-xs text-[color:var(--text-secondary)]">
                    <summary className="cursor-pointer font-semibold text-[color:var(--text-primary)]">Creative brief (reference)</summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{F365_MATCH_REPORT_SPEC}</p>
                    <p className="mt-3 whitespace-pre-wrap leading-relaxed">{F365_PREVIEW_SPEC}</p>
                  </details>
                </div>
              ) : null}
              {draftMarkdown ? (
                <pre className="max-h-[min(520px,60vh)] overflow-auto whitespace-pre-wrap rounded-xl border border-[color:var(--border)] bg-black/40 p-3 text-sm leading-relaxed text-[color:var(--text-primary)]">
                  {draftMarkdown}
                </pre>
              ) : (
                <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-black/20 p-6 text-sm text-[color:var(--text-muted)]">
                  No draft yet. Use <strong className="text-[color:var(--text-secondary)]">Generate preview</strong> or{" "}
                  <strong className="text-[color:var(--text-secondary)]">Generate report</strong> above — the model returns{" "}
                  <strong className="text-[color:var(--text-secondary)]">semantic HTML</strong> for WordPress SEO (one{" "}
                  <code className="text-[color:var(--text-muted)]">h1</code>,{" "}
                  <code className="text-[color:var(--text-muted)]">h2</code>/<code className="text-[color:var(--text-muted)]">h3</code>,{" "}
                  <code className="text-[color:var(--text-muted)]">p</code>,{" "}
                  <code className="text-[color:var(--text-muted)]">strong</code>). Same OpenAI key as Language Studio.
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Panel>
  );
}
