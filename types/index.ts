export type Movement = "backed" | "drift" | "steady" | "unknown";

/** Jockey silks on racecard boards — hex colours + simple or shirt/cap-style procedural art */
export type SilkPattern =
  | "solid"
  | "halves"
  | "stripes"
  | "quarters"
  /** Jersey base + chest disc + arm bands (accent = bands, default white) */
  | "chest_disc"
  /** Sleeves (secondary) + chest panel (body) + white V + striped cap; accent = collar */
  | "v_chest"
  /** Upward chevrons on jersey; cap solid */
  | "chevron"
  /** Timeform-style icon: shirt + cap side by side; stars (secondary) on shirt */
  | "silks_icon";

/**
 * Racing silks = jersey + cap in one asset (e.g. Timeform-style icon), or procedural fills.
 * Prefer `imageUrl` from the feed when you need a close match to official artwork.
 */
export interface RunnerSilks {
  /** Procedural torso fill; omit when using only `silkCode` / `imageUrl` from the feed. */
  body?: string;
  secondary?: string;
  cap?: string;
  /** Arm bands, collar, or trim — used by `chest_disc`, `v_chest`, etc. */
  accent?: string;
  pattern?: SilkPattern;
  /** HTTPS/http(s) URL, site-relative `/…`, or `data:image/…` — full silk (jersey + hat). */
  imageUrl?: string;
  /**
   * Timeform-style silk id (e.g. `00887104`) → `https://images.timeform.com/silks/opt/{code}.png`.
   * Tied to the horse on the same `Runner` / `Tip` / `Placing`. Renders via `/api/silk-image` when set.
   */
  silkCode?: string;
  /** Viewport width ÷ height for letterboxing (default 0.78, typical portrait icon). */
  imageAspectRatio?: number;
  /** Feed metadata (e.g. Timeform) */
  provider?: string;
  imageRefId?: number;
  altText?: string;
}

export interface Race {
  id: string;
  course: string;
  raceTime: string;
  title: string;
  distance: string;
  going: string;
  runnersCount: number;
  /** Optional feed / API metadata */
  surface?: string;
  listedRunnersIncludingNonRunners?: number;
  nonRunnersCount?: number;
  class?: number | string;
  ageBand?: string;
  ratingBand?: string;
  prizeGbp?: number;
  /** Optional course photo for classic full-board racecard header (URL or site path) */
  courseImageUrl?: string;
  /** Meeting day — ISO `yyyy-mm-dd` or display string (shown on racecard Board 1) */
  raceDate?: string;
}

/** Full racecard row — jockey/trainer/form optional for board-only feeds */
export interface Runner {
  number: number;
  horse: string;
  odds: string;
  jockey?: string;
  trainer?: string;
  form?: string;
  stars?: number;
  movement?: Movement;
  movementText?: string;
  sp?: string;
  bestOdds?: string;
  silks?: RunnerSilks;
  draw?: number;
  daysSinceRun?: number;
  officialRating?: number;
  weight?: string;
  status?: string;
}

export interface Tip {
  horse: string;
  odds: string;
  stars: number;
  race: Race;
  reason?: string;
  /** Shown on tip scenes, social cards, and list pages */
  silks?: RunnerSilks;
  /** Tip scene kicker (e.g. "TIP 1"); default "Tip 1" / "Tip 2" / "Tip 3" */
  kicker?: string;
}

export interface Placing {
  position: number;
  horse: string;
  sp: string;
  silks?: RunnerSilks;
}

export interface Result {
  race: Race;
  winner: string;
  sp: string;
  placings: Placing[];
  /** Outro line on fast-results template (defaults in generator) */
  outroCta?: string;
}

export type ContentFormat =
  | "next-off"
  | "fast-results"
  | "racecard"
  | "football-lineups"
  | "team-line-up"
  | "team-sheet"
  | "score-line"
  | "teamtalk-news"
  | "f1-grid"
  | "f1-results"
  | "planet-football-table"
  | "planet-rugby-table"
  | "news-shorts";

/** TTS voiceover — used when building Shorts audio */
export type VoiceGender = "male" | "female";

export interface SceneSpec {
  id: string;
  templateId: string;
  durationSec: number;
  captionLine: string;
  data: Record<string, unknown>;
}

/** TEAMtalk-style football news Shorts (9:16) — transfer hooks, hero frame, detail, CTA */
export interface TeamtalkNewsBundle {
  id: string;
  /** Set when a tpl-* bundle was created from the TEAMtalk mobile feed (import API). */
  feedStoryId?: number;
  /** Original article URL (feed-sourced items) */
  sourceUrl?: string;
  /** e.g. EXCLUSIVE */
  tag: string;
  /** Stacked lines on neon bars (main scene) */
  headlineLines: string[];
  /** Optional hero image (URL or data URL) */
  playerImageUrl?: string;
  leftClubLogoUrl?: string;
  rightClubLogoUrl?: string;
  /** Shown in voiceover / captions */
  playerName?: string;
  /** Middle scene body copy */
  secondaryParagraph?: string;
  /** White bar text, e.g. LINK IN FIRST COMMENT */
  linkCta: string;
  /** Final voice line */
  outroLine?: string;
  /** When set, replaces auto-generated script from headlines/detail/outro */
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  /** Playback speed 0.5–2 (1 = normal) */
  voiceSpeed?: number;
  /** Saved under output/images/library/{id}/ — Shorts background image (all scenes unless per-scene map) */
  backgroundImageRel?: string;
  /** Optional background per scene id → path under output/images/library/ */
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  /** Motion backdrop tuning (uniform black wash) — used when `backgroundVideoRel` is set */
  motionBackdropOpaqueOpacity?: number;
  /** Motion backdrop tuning (readability gradient) — used when `backgroundVideoRel` is set */
  motionBackdropDimStrength?: number;
  /** Burn subtitles in FFmpeg Shorts build */
  burnSubtitles?: boolean;
  /** Per-scene caption / duration from the Shorts editor */
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}

/** F1 starting grid — portrait 1080×1350, intro + two grid pages + outro */
export interface F1GridDriver {
  position: number;
  name: string;
  time: string;
  /** Hex team colour for the right-hand timing bar (e.g. Mercedes teal #00D2BE, Red Bull #0600EF) */
  teamColor: string;
  /** Site-relative `/…`, `https…`, or filename under `public/grid/drivers/` */
  image?: string;
  /** e.g. [Q1] [Q2] */
  tag?: string;
}

export interface F1GridBundle {
  id: string;
  title: string;
  subtitle: string;
  /** Rows per slide (default 11) — drivers beyond this go to Grid 2 */
  rowsPerPage?: number;
  drivers: F1GridDriver[];
  /** Footer line (e.g. PLANETF1.com) */
  footerBrand?: string;
  /** Optional logo image URL */
  logoUrl?: string;
  introLine?: string;
  outroLine?: string;
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  backgroundImageRel?: string;
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  motionBackdropOpaqueOpacity?: number;
  motionBackdropDimStrength?: number;
  burnSubtitles?: boolean;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}

/** F1 race result row — Pos, Driver, Time, Stops (+ team + colour like grid) */
export interface F1ResultsDriver {
  /** Sort order (1…n). Retired rows can share display “R” via positionLabel. */
  position: number;
  /** When set (e.g. "R"), shown in the POS column instead of `position`. */
  positionLabel?: string;
  name: string;
  team: string;
  time: string;
  stops: string | number;
  teamColor: string;
  image?: string;
}

/** Fastest lap — shown on the outro slide */
export interface F1FastestLap {
  driverName: string;
  team: string;
  time: string;
  stops: string | number;
  teamColor: string;
  image?: string;
}

export interface F1ResultsBundle {
  id: string;
  title: string;
  subtitle: string;
  rowsPerPage?: number;
  drivers: F1ResultsDriver[];
  fastestLap: F1FastestLap;
  footerBrand?: string;
  logoUrl?: string;
  introLine?: string;
  outroLine?: string;
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  backgroundImageRel?: string;
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  motionBackdropOpaqueOpacity?: number;
  motionBackdropDimStrength?: number;
  burnSubtitles?: boolean;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}

export type PlanetRugbyTableDisplayMode =
  | "full-table"
  | "top-half"
  | "bottom-half"
  | "head-to-head"
  | "playoff-race"
  | "bottom-battle";
export type PlanetRugbyTemplateStyle =
  | "standard-image-overlay"
  | "bottom-four"
  | "top-five"
  | "full-block-background";

export type PlanetRugbyTablePosition =
  | "left"
  | "center"
  | "lower-left"
  | "high-left"
  | "middle-left"
  | "low-left"
  | "bottom-left"
  | "high-right"
  | "middle-right"
  | "bottom-right";
export type PlanetRugbyPlayoffRows = 4 | 6 | 8;
export type PlanetRugbyBottomRows = 4 | 6;
export type PlanetRugbyTableColumnKey =
  | "position"
  | "team"
  | "played"
  | "won"
  | "drawn"
  | "lost"
  | "pointsDifference"
  | "points";

export interface PlanetRugbyTableRow {
  position: number;
  team: string;
  logoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsDifference: string;
  points: number;
}

export interface PlanetRugbyTableData {
  source: "Planet Rugby";
  sourceUrl: string;
  competition: string;
  updatedAt?: string;
  columns: [
    "position",
    "team",
    "played",
    "won",
    "drawn",
    "lost",
    "pointsDifference",
    "points",
  ];
  rows: PlanetRugbyTableRow[];
}

export type PlanetRugbyTableBackgroundStyle = "solid" | "balanced" | "clear";

export interface PlanetRugbyTableBundle {
  id: string;
  table: PlanetRugbyTableData;
  introLine?: string;
  headline?: string;
  subtitle?: string;
  outroLine?: string;
  backgroundImageUrl?: string;
  showLogo?: boolean;
  showTeamLogos?: boolean;
  tableStyle?: PlanetRugbyTemplateStyle;
  tableMode?: PlanetRugbyTableDisplayMode;
  selectedTeamA?: string;
  selectedTeamB?: string;
  /** Planet Rugby: legacy field; scene data uses actual row count (single table slide). */
  rowsToShow?: number;
  playoffRows?: PlanetRugbyPlayoffRows;
  bottomRows?: PlanetRugbyBottomRows;
  highlightColor?: string;
  fontSize?: number;
  rowSpacing?: number;
  tablePosition?: PlanetRugbyTablePosition;
  tableWidthPercent?: number;
  tableHeightPercent?: number;
  tableBackgroundStyle?: PlanetRugbyTableBackgroundStyle;
  tablePanelOpacity?: number;
  backgroundBlur?: number;
  overlayStrength?: number;
  introDurationSec?: number;
  mainDurationSec?: number;
  secondDurationSec?: number;
  outroDurationSec?: number;
  voiceoverEnabled?: boolean;
  hiddenColumns?: PlanetRugbyTableColumnKey[];
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}

export type PlanetFootballTableDisplayMode = PlanetRugbyTableDisplayMode;
export type PlanetFootballTemplateStyle = PlanetRugbyTemplateStyle;
export type PlanetFootballTablePosition = PlanetRugbyTablePosition;
export type PlanetFootballPlayoffRows = PlanetRugbyPlayoffRows;
export type PlanetFootballBottomRows = PlanetRugbyBottomRows;
export type PlanetFootballTableColumnKey = PlanetRugbyTableColumnKey;
export type PlanetFootballTableBackgroundStyle = PlanetRugbyTableBackgroundStyle;

export interface PlanetFootballTableRow extends PlanetRugbyTableRow {}

export interface PlanetFootballTableData {
  source: "Sport365";
  sourceUrl: string;
  competition: string;
  updatedAt?: string;
  columns: PlanetRugbyTableData["columns"];
  rows: PlanetFootballTableRow[];
  format?: "league" | "group_stage";
  groupCode?: string;
}

export type PlanetFootballGroupTableSnapshot = {
  groupCode: string;
  groupName: string;
  rows: PlanetFootballTableRow[];
};

export type Sport365MatchScorerSnapshot = {
  minuteLabel: string;
  player: string;
  type: "goal" | "own_goal";
  team: string;
};

export type Sport365MatchContext = {
  sourceUrl: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status?: string;
  statusLabel?: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  scorers: Sport365MatchScorerSnapshot[];
  commentaryDigest?: string;
};

export type PlanetFootballDisplayBrand =
  | "sport365"
  | "football365"
  | "teamtalk"
  | "planet-football";

export interface PlanetFootballTableBundle
  extends Omit<PlanetRugbyTableBundle, "table" | "tableStyle" | "tableMode" | "tablePosition" | "hiddenColumns"> {
  table: PlanetFootballTableData;
  tableStyle?: PlanetFootballTemplateStyle;
  tableMode?: PlanetFootballTableDisplayMode;
  tablePosition?: PlanetFootballTablePosition;
  hiddenColumns?: PlanetFootballTableColumnKey[];
  /** All imported group tables (World Cup / multi-group Sport365). */
  groupTables?: PlanetFootballGroupTableSnapshot[];
  selectedGroupCode?: string;
  /** Visual brand for rendered shorts — Sport365 default; also Football365, TEAMtalk, Planet Football. */
  displayBrand?: PlanetFootballDisplayBrand;
  /** Burn voiceover subtitles into exported video (FFmpeg ASS). Defaults true for Sport365 imports. */
  burnSubtitles?: boolean;
  /** Imported match result from Sport365 match URL (score line + scorers + commentary). */
  matchContext?: Sport365MatchContext;
  /** Show final score above the table (default on when matchContext exists). */
  showMatchScore?: boolean;
  /** Show goal scorers above the table. */
  showMatchScorers?: boolean;
  /** Show standings table on the main scene. */
  showStandingsTable?: boolean;
  /** Feed match commentary digest into AI script improvement. */
  includeCommentaryInAi?: boolean;
  /** Scale Sport365 corner logo (1 = legacy 112px). */
  brandLogoScale?: number;
  /** What to show on the main card when match data is imported. */
  cardContentMode?: "table-only" | "table-score" | "table-score-scorers";
}

/** Editable roots for template-driven formats — changing this re-materializes scenes & copy */
export type TemplateSource =
  | { format: "next-off"; bundle: NextOffBundle }
  | { format: "fast-results"; bundle: FastResultBundle }
  | { format: "racecard"; snapshot: RacecardSnapshot }
  | { format: "football-lineups"; bundle: FootballLineupBundle }
  | { format: "team-line-up"; bundle: TeamLineUpBundle }
  | { format: "team-sheet"; bundle: TeamSheetBundle }
  | { format: "score-line"; bundle: ScoreLineBundle }
  | { format: "teamtalk-news"; bundle: TeamtalkNewsBundle }
  | { format: "f1-grid"; bundle: F1GridBundle }
  | { format: "f1-results"; bundle: F1ResultsBundle }
  | { format: "planet-football-table"; bundle: PlanetFootballTableBundle }
  | { format: "planet-rugby-table"; bundle: PlanetRugbyTableBundle };

export interface GeneratedContent {
  format: ContentFormat;
  headline: string;
  caption: string;
  script: string;
  scenes: SceneSpec[];
  oddsHighlight?: string;
  cta?: string;
  /** Voiceover TTS — default female when omitted */
  voiceGender?: VoiceGender;
  /** Playback speed 0.5–2 (1 = normal) */
  voiceSpeed?: number;
  /** When set, “Template data” edits this and rebuild scenes via materialize */
  templateSource?: TemplateSource;
}

export interface ShortBuildRequest {
  format: ContentFormat;
  contentId: string;
  scenes: { imagePath: string; durationSec: number; caption: string }[];
  audioFile: string;
  subtitles: { startSec: number; endSec: number; text: string }[];
  outputFile: string;
}

/** Declared non-runner (scratch) — for display / feed round-trip */
export interface RacecardNonRunner {
  number: number;
  horse: string;
  status?: string;
  trainer?: string;
}

export interface RacecardSnapshot {
  id: string;
  /** Plexa: blank editor vs URL import */
  importSource?: "url" | "manual";
  /** Original racecard page URL when `importSource` is `url` */
  sourceUrl?: string;
  /** Raw API/HTML-derived payload for debugging / re-export */
  rawImport?: unknown;
  race: Race;
  /** Full field — any count; scenes paginate for Shorts */
  runners: Runner[];
  topPicks: string[];
  /** Scratch list from feed (optional) */
  nonRunners?: RacecardNonRunner[];
  marketMover?: Runner;
  /** Shown on last board page, e.g. 4 → "EACH WAY 4 PLACES" */
  eachWayPlaces?: number;
  /** Custom footer line; if unset and eachWayPlaces set, default line is generated */
  footerNote?: string;
  /**
   * Max runners per Shorts board page (6–40). If omitted, Board 1 fits the full field (up to 40 runners per frame).
   */
  boardRunnersPerPage?: number;
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
  /** Per-scene field motion for racecard HTML / PNG previews */
  sceneAnimations?: RacecardSceneAnimations;
  /** Editor backdrop assets (persisted with template) */
  backgroundImageRel?: string;
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  motionBackdropOpaqueOpacity?: number;
  motionBackdropDimStrength?: number;
}

/** CSS animation preset for Next off template fields (PNG preview; matches scene compositor naming) */
export type TemplateFieldAnimPreset =
  | "none"
  | "fade-in"
  | "slide-up"
  | "slide-left"
  | "zoom-in"
  | "pulse";

export interface TemplateFieldAnimation {
  preset?: TemplateFieldAnimPreset;
  /** Seconds (default 0.7, clamped in renderer) */
  durationSec?: number;
  delaySec?: number;
}

/** Per-field motion for next-off-intro */
export interface NextOffIntroFieldAnimations {
  introKicker?: TemplateFieldAnimation;
  course?: TemplateFieldAnimation;
  raceTime?: TemplateFieldAnimation;
  title?: TemplateFieldAnimation;
  distance?: TemplateFieldAnimation;
  going?: TemplateFieldAnimation;
  runnersCount?: TemplateFieldAnimation;
}

/** Per-field motion for next-off-tip */
export interface NextOffTipFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  horse?: TemplateFieldAnimation;
  odds?: TemplateFieldAnimation;
  stars?: TemplateFieldAnimation;
  silks?: TemplateFieldAnimation;
}

/** Per-field motion for next-off-outro */
export interface NextOffOutroFieldAnimations {
  outroKicker?: TemplateFieldAnimation;
  outroCta?: TemplateFieldAnimation;
  course?: TemplateFieldAnimation;
}

export interface NextOffSceneAnimations {
  intro?: NextOffIntroFieldAnimations;
  tip1?: NextOffTipFieldAnimations;
  tip2?: NextOffTipFieldAnimations;
  tip3?: NextOffTipFieldAnimations;
  outro?: NextOffOutroFieldAnimations;
}

/** Fast results — intro scene (fast-intro) */
export interface FastIntroFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  title?: TemplateFieldAnimation;
  course?: TemplateFieldAnimation;
  raceTime?: TemplateFieldAnimation;
  raceDate?: TemplateFieldAnimation;
}

/** Fast results — winner scene (fast-winner) */
export interface FastWinnerFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  winner?: TemplateFieldAnimation;
  sp?: TemplateFieldAnimation;
  course?: TemplateFieldAnimation;
  silks?: TemplateFieldAnimation;
}

/** Fast results — placings scene (fast-placings) */
export interface FastPlacingsFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  card?: TemplateFieldAnimation;
}

/** Fast results — outro scene (fast-outro) */
export interface FastOutroFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  cta?: TemplateFieldAnimation;
}

export interface FastResultsSceneAnimations {
  intro?: FastIntroFieldAnimations;
  winner?: FastWinnerFieldAnimations;
  placings?: FastPlacingsFieldAnimations;
  outro?: FastOutroFieldAnimations;
}

/** Racecard intro (rc-intro) */
export interface RcIntroFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  title?: TemplateFieldAnimation;
  course?: TemplateFieldAnimation;
  raceTime?: TemplateFieldAnimation;
  meta?: TemplateFieldAnimation;
}

/** LED board (rc-board-grid) */
export interface RcBoardGridFieldAnimations {
  headerTitle?: TemplateFieldAnimation;
  raceName?: TemplateFieldAnimation;
  pageMeta?: TemplateFieldAnimation;
  listCard?: TemplateFieldAnimation;
}

/** Market mover (rc-mover) */
export interface RcMoverFieldAnimations {
  sceneKicker?: TemplateFieldAnimation;
  horse?: TemplateFieldAnimation;
  odds?: TemplateFieldAnimation;
  movementText?: TemplateFieldAnimation;
  silks?: TemplateFieldAnimation;
}

/** Branded CTA (rc-cta) */
export interface RcCtaFieldAnimations {
  course?: TemplateFieldAnimation;
  brand?: TemplateFieldAnimation;
  cta?: TemplateFieldAnimation;
}

export interface RacecardSceneAnimations {
  intro?: RcIntroFieldAnimations;
  board?: RcBoardGridFieldAnimations;
  mover?: RcMoverFieldAnimations;
  cta?: RcCtaFieldAnimations;
}

export interface NextOffBundle {
  id: string;
  race: Race;
  tips: Tip[];
  /** Intro scene kicker (next-off-intro); default "Next off" */
  introKicker?: string;
  /** Outro scene small top line (next-off-outro); default brand mark */
  outroKicker?: string;
  /** Outro scene headline text (next-off-outro template) */
  outroCta?: string;
  /** Optional per-scene / per-field animation for Next off HTML previews */
  sceneAnimations?: NextOffSceneAnimations;
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
  backgroundImageRel?: string;
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  motionBackdropOpaqueOpacity?: number;
  motionBackdropDimStrength?: number;
}

export interface FastResultBundle {
  id: string;
  result: Result;
  /** Per-scene field motion for Fast results HTML / PNG previews */
  sceneAnimations?: FastResultsSceneAnimations;
  script?: string;
  aiPrompt?: string;
  aiVoiceStyle?: "Journalist" | "Punchy Tips" | "Calm / Studio" | "Fast Picks";
  aiDeliveryStyle?: "Smooth" | "Balanced" | "Fast";
  aiTone?: "Neutral" | "Confident" | "Urgent";
  voiceGender?: VoiceGender;
  voiceSpeed?: number;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
  backgroundImageRel?: string;
  backgroundImageRelBySceneId?: Record<string, string>;
  backgroundVideoRel?: string;
  motionBackdropOpaqueOpacity?: number;
  motionBackdropDimStrength?: number;
}

/** Pitch position as percentage of pitch box (0–100), y from top */
export interface FootballLineupStarter {
  n: number;
  name: string;
  x: number;
  y: number;
  /** Goalkeeper kit on the pitch (board 1) */
  gk?: boolean;
  /** Shown under the shirt; if omitted, last word of name is used */
  surname?: string;
}

export interface FootballLineupSide {
  name: string;
  shortName?: string;
  formation: string;
  shirtColor: string;
  numberColor: string;
  /** Sleeve / trim on jersey SVG (defaults in renderer) */
  sleeveColor?: string;
  /** GK shirt body when starter has gk: true */
  gkShirtColor?: string;
  /** Collar / cuff trim on jersey SVG (renderer defaults from shirt luminance) */
  trimColor?: string;
  starters: FootballLineupStarter[];
}

export interface FootballBenchRow {
  n: number;
  name: string;
  /** Under-shirt label on board 2; if omitted, last word of name */
  surname?: string;
  /** Shown on bench board (e.g. GK, CM); GK uses goalkeeper kit colour */
  position?: string;
}

export interface FootballInjuryRow {
  /** Squad # on shirt (board 3); omit or 0 for no number */
  n?: number;
  name: string;
  detail: string;
  surname?: string;
}

export interface FootballLineupBundle {
  id: string;
  league: string;
  matchDate: string;
  kickoff: string;
  home: FootballLineupSide;
  away: FootballLineupSide;
  bench: { home: FootballBenchRow[]; away: FootballBenchRow[] };
  injuries: { home: FootballInjuryRow[]; away: FootballInjuryRow[] };
  matchId?: string;
  sourceUrl?: string;
  competition?: string;
  lineupStatus?: TeamLineUpLineupStatus;
}

export type TeamLineUpBrandStyle = "football365" | "teamtalk" | "planetfootball" | "sport365";
export type TeamLineUpTeamView = "home" | "away" | "both";
export type TeamLineUpLineupStatus = "predicted" | "confirmed";
export type TeamLineUpExportAspect = "landscape" | "portrait" | "story" | "social";
export type TeamLineUpKitSlot = "home" | "away" | "third";
export type TeamSheetVariant = "standard" | "split" | "hero" | "combined";

/** Formation pitch cards — Sport365 import + multi-brand styling. */
export interface TeamLineUpBundle extends FootballLineupBundle {
  matchId?: string;
  sourceUrl?: string;
  competition?: string;
  brandStyle: TeamLineUpBrandStyle;
  teamView: TeamLineUpTeamView;
  lineupStatus: TeamLineUpLineupStatus;
  exportAspect: TeamLineUpExportAspect;
  homeKitSlot: TeamLineUpKitSlot;
  awayKitSlot: TeamLineUpKitSlot;
  generateAiCaption?: boolean;
  aiCaption?: string;
  introLine?: string;
  outroLine?: string;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}

/** Full-bleed hero + bottom score overlay — Sport365 match result graphics. */
export interface ScoreLineBundle {
  id: string;
  brandStyle: TeamLineUpBrandStyle;
  exportAspect: TeamLineUpExportAspect;
  matchContext: Sport365MatchContext;
  sourceUrl?: string;
  competition?: string;
  matchDate?: string;
  /** Optional stored hero background (editor upload overrides at render). */
  heroImageUrl?: string;
  /** Override status ribbon e.g. FULL TIME, HALF TIME, LIVE */
  statusDisplay?: string;
  generateAiCaption?: boolean;
  aiCaption?: string;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}

/** Readable team sheet layouts — separate template from formation line-ups. */
export interface TeamSheetBundle extends FootballLineupBundle {
  matchId?: string;
  sourceUrl?: string;
  competition?: string;
  brandStyle: TeamLineUpBrandStyle;
  sheetVariant: TeamSheetVariant;
  teamView: TeamLineUpTeamView;
  lineupStatus: TeamLineUpLineupStatus;
  exportAspect: TeamLineUpExportAspect;
  homeKitSlot: TeamLineUpKitSlot;
  awayKitSlot: TeamLineUpKitSlot;
  /** Featured player for hero / standard / split image area. */
  heroPlayerName?: string;
  generateAiCaption?: boolean;
  aiCaption?: string;
  sceneEdits?: Record<string, { captionLine?: string; durationSec?: number }>;
}
