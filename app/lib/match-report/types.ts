import type { OptaPlayerIntelligence } from "@/app/lib/match-report/opta-player-types";

export type MatchReportSport = "football";
export type MatchReportContentType = "match_report";
export type MatchReportScope = "full" | "first_half";
export type MatchReportFormat = "home" | "away" | "live_first_half" | "neutral" | "neutral_dual";
export type MatchReportPerspective = "home" | "away" | "live_first_half" | "neutral";
export type MatchReportStatus = "draft" | "in_progress" | "review" | "published";
export type MatchReportWorkflowPhase =
  | "editorial"
  | "match_id"
  | "foundation_ready"
  | "import_layers"
  | "generation"
  | "review"
  | "published";
export type MatchReportWorkflowStep =
  | "editorial_brief"
  | "match_id"
  | "sixlogic_core"
  | "competition_rules"
  | "sport365"
  | "league_table"
  | "league_stats"
  | "loop_feed"
  | "whoscored"
  | "manual_sources"
  | "build_picture"
  | "player_intelligence"
  | "transcripts"
  | "image_intelligence"
  | "media_builder"
  | "review"
  | "published";

export type MatchReportTargetBrand = "football365" | "teamtalk" | "planet-football" | "sport365";

export type LayerWeightMap = {
  sixLogic: number;
  sport365Commentary: number;
  leagueTable: number;
  loopFeed: number;
  optaPlayerData: number;
  interviews: number;
  manualSources: number;
  playerIntelligence: number;
};

export type EditorialProfile = {
  sport: MatchReportSport;
  contentStyle: "Match report";
  targetBrand: MatchReportTargetBrand;
  brandStyle: string;
  /** Match-report STYLE prompt (Language Studio content-style preset). */
  rewriteStyle: string;
  useCreatorProfile: boolean;
  journalistProfileId?: string;
  creatorName?: string;
  creatorStyleNotes: string;
  /** From Content Creator profile — neutral or club supporter. */
  creatorTeamSupportMode?: "neutral" | "club";
  creatorSupportedClub?: string;
  articleGuidelines: string;
  competitionCode?: string;
  sportRuleIds?: string[];
  layerWeights: LayerWeightMap;
  /** AI-facing brand tone from Knowledge Base (e.g. TEAMtalk style guide). */
  brandStyleGuide?: string;
  knowledgeFileIds?: string[];
};

export type SixLogicPlayer = {
  shirtNumber?: number;
  name: string;
  position?: string;
  isSubstitute?: boolean;
};

export type SixLogicLineup = {
  formation?: string;
  starters: SixLogicPlayer[];
  substitutes: SixLogicPlayer[];
};

export type SixLogicEvent = {
  minute?: number;
  second?: number;
  type: string;
  text: string;
  teamSide?: "home" | "away" | "neutral";
  playerName?: string;
};

export type SixLogicCommentaryLine = {
  minute?: number;
  text: string;
};

export type SixLogicFacts = {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  competition: string;
  competitionCode?: string;
  kickoffIso?: string;
  fullTimeIso?: string;
  round?: string;
  season?: string;
  addedTimeMinutes?: string;
  venue?: string;
  venueCity?: string;
  venueCapacity?: number;
  attendance?: number;
  homeCoach?: string;
  awayCoach?: string;
  referee?: string;
  status?: string;
  minuteElapsed?: number;
};

export type SixLogicFoundation = {
  matchId: string;
  sportId: string;
  facts: SixLogicFacts;
  lineups: { home: SixLogicLineup; away: SixLogicLineup };
  events: SixLogicEvent[];
  commentary: SixLogicCommentaryLine[];
  summaryText?: string;
  normalisedAt: string;
  sourceKeyPaths?: string[];
};

export type Sport365CommentaryLine = {
  minute?: number;
  text: string;
  eventType?: string;
  teamSide?: "home" | "away" | "neutral";
  playerName?: string;
};

export type Sport365Commentary = {
  sourceUrl: string;
  matchPageId: string;
  homeTeam?: string;
  awayTeam?: string;
  competition?: string;
  lines: Sport365CommentaryLine[];
  digest: string;
  importedAt: string;
};

export type LeagueTableRowSnapshot = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsDifference: string;
  points: number;
  goalsFor?: number;
  goalsAgainst?: number;
  highlighted?: boolean;
  qualificationStatus?: string;
};

export type GroupQualificationLegend = {
  stagePhase: number;
  label: string;
};

export type GroupTableSnapshot = {
  groupCode: string;
  groupName: string;
  rows: LeagueTableRowSnapshot[];
  legend?: GroupQualificationLegend[];
};

export type LeagueTableFormat = "league" | "group_stage";

export type LeagueTableIntelligence = {
  sourceUrl: string;
  source?: "Sport365" | "Football365";
  competition: string;
  format?: LeagueTableFormat;
  tableView?: string;
  groupCode?: string;
  groupTables?: GroupTableSnapshot[];
  qualificationLegend?: GroupQualificationLegend[];
  rows: LeagueTableRowSnapshot[];
  homeTeamRow?: LeagueTableRowSnapshot;
  awayTeamRow?: LeagueTableRowSnapshot;
  homeStakes?: string;
  awayStakes?: string;
  digest: string;
  importedAt: string;
};

export type TopScorerSnapshot = {
  rank: number;
  playerName: string;
  team: string;
  goals: number;
  penalties: number;
  highlighted?: boolean;
};

export type TeamSeasonStatsSnapshot = {
  team: string;
  played: number;
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  penaltyGoals: number;
  gamesWithoutGoal: number;
  yellowCards: number;
  avgYellowCardsPerGame: number;
  wonFirstHalf: number;
  wonSecondHalf: number;
  wonAtHome: number;
  wonAtAway: number;
  awayWithoutWin: number;
  bothTeamsScored: number;
  firstHalfLossFullTimeWin: number;
  firstHalfWinFullTimeLoss: number;
  boreDraws: number;
  goalsPerGame: number;
  minutesPerGoalScored: number;
  minutesPerGoalConceded: number;
};

export type LeagueSeasonStatsIntelligence = {
  sourceUrl: string;
  stageId: string;
  competition: string;
  topScorers: TopScorerSnapshot[];
  teamStats: TeamSeasonStatsSnapshot[];
  homeTeamStats?: TeamSeasonStatsSnapshot;
  awayTeamStats?: TeamSeasonStatsSnapshot;
  matchGoalscorerContext: string[];
  digest: string;
  importedAt: string;
};

export type FixtureMeetingSnapshot = {
  date?: string;
  competition?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
};

export type NextFixtureSnapshot = {
  team: string;
  opponent?: string;
  date?: string;
  competition?: string;
  isHome?: boolean;
  sixLogicMatchId?: string;
};

export type FixtureContextIntelligence = {
  sourceUrl: string;
  matchPageId?: string;
  headToHead: FixtureMeetingSnapshot[];
  homeRecentResults: FixtureMeetingSnapshot[];
  awayRecentResults: FixtureMeetingSnapshot[];
  homeNextFixture?: NextFixtureSnapshot;
  awayNextFixture?: NextFixtureSnapshot;
  seasonDouble?: {
    completed: boolean;
    homeMeeting?: FixtureMeetingSnapshot;
    awayMeeting?: FixtureMeetingSnapshot;
  };
  digest: string;
  importedAt: string;
};

export type MatchReportCalendarFixture = {
  id: string;
  scheduleSlug?: string;
  kickoffIso?: string;
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  group?: string;
  sportId: string;
  matchId: string;
  betwayMatchId?: string;
  targetBrands?: MatchReportTargetBrand[];
  reportProjectId?: string;
  reportCompletedAt?: string;
  reportDisplayLabel?: string;
};

export type LoopFeedIntelligence = {
  contextDate: string;
  fetchedAt: string;
  digest: string;
  sides: import("@/app/lib/data-studio/loop-feed").LoopFeedSideResult[];
  importedAt: string;
};

export type ManualSourceType =
  | "Journalist opinion"
  | "Match report"
  | "Quotes"
  | "Tactical note"
  | "Other";

export type ManualSourceConfidence = "High" | "Medium" | "Low";

export type ManualSource = {
  id: string;
  source: "BBC" | "Sky" | "Athletic" | "Quotes" | "Blog" | "Notes" | "URL" | "Loop Feed";
  type: ManualSourceType;
  confidence: ManualSourceConfidence;
  title?: string;
  url?: string;
  excerpt: string;
  /** Set when auto-extracted from Loop Feed posts during import. */
  derivedFrom?: "loop_feed";
  /** Home/away side label from Loop Feed import (e.g. club name). */
  loopFeedSideLabel?: string;
  loopFeedAuthor?: string;
  /** X handle without @ when extracted from Loop Feed. */
  loopFeedHandle?: string;
  /** Matched Content Creator profile from Language Studio. */
  journalistProfileId?: string;
  importedAt: string;
};

export type EventPictureKeyMoment = {
  minute?: number;
  title: string;
  summary: string;
};

export type EventPictureLayerSummary = {
  layer: string;
  title: string;
  summary: string;
  digestExcerpt?: string;
  skipped?: boolean;
};

export type EventPicture = {
  headlineAngle: string;
  standfirstHooks: string[];
  keyMoments: EventPictureKeyMoment[];
  narrativeThreads: string[];
  factualAnchors: string[];
  toneNotes: string;
  /** One-line summary per imported data layer — persisted for downstream AI and review. */
  layerSummaries?: EventPictureLayerSummary[];
  generatedAt: string;
  model?: string;
};

export type InterviewQuote = {
  speaker: string;
  role?: string;
  quote: string;
};

export type InterviewIntelligence = {
  id: string;
  sourceUrl: string;
  videoId?: string;
  title?: string;
  channelName?: string;
  /** Which side this clip supports in combined match reports; omit on older projects. */
  team?: "home" | "away" | "neutral";
  /** Full transcript text for AI ingest and Language Studio handoff. */
  transcriptText?: string;
  transcriptSource?: "youtube_api" | "apify" | "manual_paste" | "uploaded_transcription";
  /** AI article-style summary for match report ingest. */
  summary?: string;
  quotes: InterviewQuote[];
  themes: string[];
  digest: string;
  importedAt: string;
  /** Set when transcript is sent to Language Studio Rewrite. */
  languageArticleId?: string;
};

export type PlayerRatingEntry = {
  name: string;
  team: "home" | "away";
  rating: number;
  justification: string;
  position?: string;
  isSubstitute?: boolean;
};

export type PlayerIntelligence = {
  homeTeam: string;
  awayTeam: string;
  ratings: PlayerRatingEntry[];
  manOfTheMatch?: string;
  narrativeDigest: string;
  generatedAt: string;
  model?: string;
  usedOptaRatings: boolean;
};

export type ImageAsset = {
  url: string;
  width?: number;
  height?: number;
  rel?: string;
  label?: string;
};

export type ImageIntelligence = {
  source: "library" | "ai_generated" | "skipped";
  rightsChecked: boolean;
  hero: ImageAsset;
  variants?: {
    instagram?: ImageAsset;
    stories?: ImageAsset;
    youtubeThumb?: ImageAsset;
    shortsStill?: ImageAsset;
  };
  libraryRef?: string;
  generationPrompt?: string;
  approvedAt?: string;
};

export type MediaOutputs = {
  headline: string;
  standfirst: string;
  reportHtml: string;
  playerRatingsHtml?: string;
  sixteenConclusionsHtml?: string;
  socialPosts?: string[];
  generatedAt: string;
  model?: string;
};

export type ArchiveRecord = {
  /** Language Studio article created when media is generated — edit in Rewrite tab. */
  languageStudioArticleId?: string;
  languageStudioImportId?: string;
  languageStudioUrl?: string;
  publishedArticleId?: string;
  publishedImportId?: string;
  publishedAt?: string;
};

export type SkippedLayer = {
  layer: string;
  reason: string;
  confidencePenalty: number;
};

export type MatchReportHealth = {
  ok: boolean;
  missingCore: string[];
  skippedLayers: SkippedLayer[];
};

export type MatchReportLayers = {
  sixLogic: SixLogicFoundation | null;
  sport365Commentary: Sport365Commentary | null;
  leagueTable: LeagueTableIntelligence | null;
  leagueSeasonStats: LeagueSeasonStatsIntelligence | null;
  fixtureContext: FixtureContextIntelligence | null;
  loopFeed: LoopFeedIntelligence | null;
  optaPlayerData: OptaPlayerIntelligence | null;
  interviews: InterviewIntelligence[];
  manualSources: ManualSource[];
};

export type MatchReportProject = {
  id: string;
  sport: MatchReportSport;
  contentType: MatchReportContentType;
  reportScope: MatchReportScope;
  /** Home / away / live HT / neutral — stored on each project; neutral_dual is wizard-only (creates home + away projects). */
  reportFormat: MatchReportPerspective;
  /** Linked home/away report when created from neutral dual. */
  pairedProjectId?: string;
  editorial: EditorialProfile;
  matchId: string;
  sportId: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  displayLabel: string;
  status: MatchReportStatus;
  workflowStep: MatchReportWorkflowStep;
  workflowPhase: MatchReportWorkflowPhase;
  layers: MatchReportLayers;
  health: MatchReportHealth;
  confidence: number;
  eventPicture: EventPicture | null;
  playerIntelligence: PlayerIntelligence | null;
  imageIntelligence: ImageIntelligence | null;
  mediaOutputs: MediaOutputs | null;
  archive: ArchiveRecord | null;
  /** Parent editorial calendar event when started from Schedule Studio. */
  calendarEventId?: string;
  calendarPhase?: "pre_match" | "live" | "report_post";
  createdAt: string;
  updatedAt: string;
};

export type SavedReportIndexEntry = {
  projectId: string;
  matchId: string;
  sport: MatchReportSport;
  contentType: MatchReportContentType;
  competitionCode?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  targetBrand?: MatchReportTargetBrand;
  brandStyle?: string;
  creatorName?: string;
  displayLabel: string;
  matchDate?: string;
  confidence: number;
  workflowStep: MatchReportWorkflowStep;
  reportCompleted?: boolean;
  publishedAt?: string;
  updatedAt: string;
};

export type MatchReportIndex = { version: 1; entries: SavedReportIndexEntry[] };

export type CreateMatchReportProjectInput = {
  editorial: Partial<EditorialProfile> & Pick<EditorialProfile, "targetBrand">;
  /** Required when reportFormat is neutral_dual — editorial for the away-perspective linked report. */
  awayEditorial?: Partial<EditorialProfile> & Pick<EditorialProfile, "targetBrand">;
  matchId: string;
  sportId?: string;
  reportScope?: MatchReportScope;
  reportFormat?: MatchReportFormat;
  calendarEventId?: string;
  calendarPhase?: "pre_match" | "live" | "report_post";
};

export type CreateMatchReportProjectResult = {
  project: MatchReportProject;
  pairedProject?: MatchReportProject;
};

export type PatchMatchReportProjectInput = {
  editorial?: Partial<EditorialProfile>;
  reportScope?: MatchReportScope;
  mediaOutputs?: Partial<MediaOutputs>;
  status?: MatchReportStatus;
  workflowStep?: MatchReportWorkflowStep;
  workflowPhase?: MatchReportWorkflowPhase;
  calendarEventId?: string;
  calendarPhase?: "pre_match" | "live" | "report_post";
};

export type { OptaPlayerIntelligence };
