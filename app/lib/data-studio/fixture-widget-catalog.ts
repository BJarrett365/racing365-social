/**
 * Maps Football365-style UI (match centre app + web preview) to clusters commonly found
 * in consolidated fixture feeds (e.g. SixLogics SportccFixture-style APIs).
 *
 * Exact JSON paths vary by provider — validate against a live feed response when integrating.
 */

export type FixtureUiSurface = "match_centre" | "preview_article";

export type FixtureWidgetCatalogRow = {
  id: string;
  uiSurface: FixtureUiSurface;
  widgetOrHeader: string;
  /** Typical payload groupings — rename to match your API schema. */
  typicalFeedClusters: string;
  /** Where this surfaces in long-form preview copy (H2 / sidebar behaviour). */
  previewArticleUse: string;
  /** Live/post preview centre + reports. */
  matchCentreUse: string;
};

/** Football — aligns with F365 mobile tabs + web preview widgets you shared. */
export const FOOTBALL_FIXTURE_WIDGET_CATALOG: FixtureWidgetCatalogRow[] = [
  {
    id: "hdr-status-score",
    uiSurface: "match_centre",
    widgetOrHeader: "Header — competition, live/FT, score, clock",
    typicalFeedClusters:
      "fixture.status · league/competition · home_team / away_team · score_home · score_away · period · minute_elapsed",
    previewArticleUse:
      "Deck + match header card (competition, crests, KO time — not the live minute unless preview is match-day live)",
    matchCentreUse: "Primary scoreboard; drives “report led” when FT",
  },
  {
    id: "hdr-form",
    uiSurface: "match_centre",
    widgetOrHeader: "Form strip (last five W/L/D)",
    typicalFeedClusters: "team_recent_form[] · results_sequence · last_N_matches result codes",
    previewArticleUse: "Sidebar “Recent form” + intro stakes paragraph",
    matchCentreUse: "Below team names on centre header",
  },
  {
    id: "hdr-meta-bar",
    uiSurface: "match_centre",
    widgetOrHeader: "Meta row — date, venue, referee",
    typicalFeedClusters: "kickoff_iso · stadium.name · referee.name",
    previewArticleUse: "H2 “Kick-off time” + venue inline; referee in team-news or odds context",
    matchCentreUse: "Icons row under scoreboard",
  },
  {
    id: "tab-summary",
    uiSurface: "match_centre",
    widgetOrHeader: "Tab — Summary",
    typicalFeedClusters: "match_summary_text · key_incidents_short · half_time_score",
    previewArticleUse: "Optional short dek if feed provides neutral summary text",
    matchCentreUse: "Snapshot before diving into commentary",
  },
  {
    id: "tab-commentary",
    uiSurface: "match_centre",
    widgetOrHeader: "Tab — Commentary (timestamped)",
    typicalFeedClusters: "commentary_events[] { minute, second?, text, type? }",
    previewArticleUse: "Generally omit from preview; post-match drives “Key moments” narrative",
    matchCentreUse: "Live scroll; primary source for report timeline when text-only",
  },
  {
    id: "tab-stats",
    uiSurface: "match_centre",
    widgetOrHeader: "Tab — Stats (half / full toggle)",
    typicalFeedClusters:
      "statistics_by_period { half_1, full_time } · shots_on · shots_off · corners · yellow · red · possession_pct · xG (if supplied)",
    previewArticleUse:
      "Web “Stats comparison” bars + footer insight line; preview uses season aggregates when live stats absent",
    matchCentreUse: "Side-by-side comparative rows + possession widget",
  },
  {
    id: "tab-lineups",
    uiSurface: "match_centre",
    widgetOrHeader: "Tab — Line-ups (confirmed) + pitch plot",
    typicalFeedClusters:
      "lineups { formation, players[] { shirt_number, name, position_code, plot_x, plot_y } } · substitutes",
    previewArticleUse:
      "“Predicted line-ups” pitch graphic when feed marks predicted; confirmed XI post-team-sheet",
    matchCentreUse: "Formation string + jersey markers on pitch",
  },
  {
    id: "tab-table",
    uiSurface: "match_centre",
    widgetOrHeader: "Tab — Table (standings)",
    typicalFeedClusters: "league_table.rows[] · rank · mp · w · d · l · pts · highlight_team_ids",
    previewArticleUse: "Intro / prediction stakes (“title race”, “relegation scrap”) when positions supplied",
    matchCentreUse: "Filters All / Home / Away / Form; highlight participating clubs",
  },
  {
    id: "tab-h2h",
    uiSurface: "match_centre",
    widgetOrHeader: "Tab — H2H + recent singles",
    typicalFeedClusters:
      "head_to_head_fixtures[] { season, competition, score, date } · team_last_results_home · team_last_results_away",
    previewArticleUse: "Sidebar “Recent meetings” + narrative hook in deck",
    matchCentreUse: "Grouped historical list + per-team form stack",
  },
  {
    id: "pv-team-news",
    uiSurface: "preview_article",
    widgetOrHeader: "H2 — Team news (home / away)",
    typicalFeedClusters: "injuries · suspensions · doubts · returns · manager_quotes (if licensed)",
    previewArticleUse: "Dedicated H2 per side; core preview factual spine",
    matchCentreUse: "Rarely shown live unless feed exposes breaking team-sheet updates",
  },
  {
    id: "pv-broadcast",
    uiSurface: "preview_article",
    widgetOrHeader: "H2 — How to watch",
    typicalFeedClusters: "tv_channels[] · streaming · radio · territory",
    previewArticleUse: "Bullet list from feed; omit if not in payload",
    matchCentreUse: "Sometimes mirrored in Summary",
  },
  {
    id: "pv-odds",
    uiSurface: "preview_article",
    widgetOrHeader: "H2 — Odds + tip copy",
    typicalFeedClusters: "markets { match_result, anytime_scorer, scorelines[] } · bookmaker disclaimers",
    previewArticleUse: "Fractionals/decimals as provided + gamble responsibly strip",
    matchCentreUse: "Usually omitted live unless in-play markets fed",
  },
  {
    id: "pv-prediction-card",
    uiSurface: "preview_article",
    widgetOrHeader: "Prediction callout + pull-quote",
    typicalFeedClusters: "editor_prediction_headline · editor_prediction_summary (or generate only from facts)",
    previewArticleUse: "Gradient card module; quote must follow feed/editor brief",
    matchCentreUse: "N/A pre-match web only",
  },
  {
    id: "pv-season-stats-compare",
    uiSurface: "preview_article",
    widgetOrHeader: "Season stats comparison (xG, possession, shots, conversion)",
    typicalFeedClusters: "season_stats.home.{xg_for, possession_avg, shots_pg, conversion_pct} · away.*",
    previewArticleUse: "Bar comparison widget + one-line “stats say…” insight",
    matchCentreUse: "Optional extra tab or folded under Stats when season scope selected",
  },
  {
    id: "pv-win-prob",
    uiSurface: "preview_article",
    widgetOrHeader: "Win / draw / loss probability",
    typicalFeedClusters: "model_probabilities { home, draw, away } · model_name · updated_at",
    previewArticleUse: "Sidebar bars; phrase cautiously (“model suggests…”) if values present",
    matchCentreUse: "Occasionally mirrored on web preview only",
  },
  {
    id: "pv-player-duel",
    uiSurface: "preview_article",
    widgetOrHeader: "Related player analysis (vs)",
    typicalFeedClusters: "player_compare[] { player_a stats, player_b stats }",
    previewArticleUse: "“Key battle” short section",
    matchCentreUse: "Supporting widget on preview",
  },
];
