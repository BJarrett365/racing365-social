# Match Preview V1 — Product & Intelligence Layer Specification

**Product:** Planet Sport Studio (Plexa)  
**Repo:** `racing365-social`  
**Status:** V1 specification (implementation in progress)  
**Companion:** [Match Intelligence Engine plan](./plexa-match-intelligence-engine-plan.md) · [Match Report Builder R&D Plan](./match-report-builder-rd-plan.md) · [Match Preview Editorial & SEO Benchmark R&D](./match-preview-rd-report.md)

---

## 0. Editorial benchmark (Football365)

Competitive benchmark and scorecard for what “great” looks like in market — including the [England v Costa Rica F365 preview](https://www.football365.com/match-preview/england-v-costa-rica-prediction-preview) (scored **7.4/10** overall; Plexa target **9.5+/10**). Covers SEO, E-E-A-T, section structure, stats depth, tactical blocks, and mapping to PIO layers.

**Full report:** [`docs/match-preview-rd-report.md`](./match-preview-rd-report.md)

---

## 1. Product scope (V1)

### 1.1 Content type

- Add `contentType: "match_preview"` alongside existing `"match_report"` on `MatchReportProject`.
- Same persistence model (`plexa-match-report` blob store), same wizard shell, branching workflow and PIO assembly.

### 1.2 Sport & competitions

| Scope | V1 | Notes |
|-------|-----|-------|
| Sport | Football only | Same as match reports |
| Competitions | Premier League, World Cup 2026 | Reuse existing schedule seeds (`epl`, `wc2026`) |
| Brands | football365, teamtalk, planet-football, sport365 | All four schedule editorial brands |

### 1.3 Editorial timing

| Phase | Target window | Calendar phase |
|-------|---------------|----------------|
| Match preview | T−48h to T−2h before kickoff | `pre_match` |
| Match report | After full-time (or live HT for `first_half` scope) | `report_post` |

Editors may start a preview any time before kickoff once SixLogics match ID is available. Schedule UI surfaces **Preview** and **Report** as separate actions per brand per fixture.

### 1.4 Out of scope (V1)

- Non-football sports
- Dual home/away preview projects (`neutral_dual` remains report-only)
- Post-match player ratings in preview output
- Automated publish at kickoff
- Deprecating Data Studio preview (migration path documented; cutover in V2)

---

## 2. PIO — Preview Intelligence Object

PIO parallels EIO (`assembleEioPromptSections`). **Rule:** never send raw feed JSON to the model in the builder pipeline.

### 2.1 PIO section schema

| Section key | Source layer / function | Pre-match data |
|-------------|-------------------------|----------------|
| `IMPORT_LAYER_SUMMARIES` | `formatImportLayerSummariesBlock` | Completed import one-liners |
| `EDITORIAL_GOVERNANCE` | `buildEditorialGovernanceBlock` | Brand, creator, E-E-A-T |
| `LAYER_WEIGHTS` | `buildLayerWeightsBlock` | Brand-tuned weights |
| `MATCH_FOUNDATION_SUMMARY` | `buildMatchFoundationSummary` | Teams, competition, venue, kickoff (score optional pre-match) |
| `SIXLOGICS_AVAILABLE_DATA` | `buildSixLogicAvailableDataBlock` | Section manifest |
| `FORM_DIGEST` | `buildFormDigestBlock` | `lastHomeResults`, `lastAwayResults` |
| `H2H_DIGEST` | `buildH2HDigestBlock` | `headToHead` |
| `FIXTURE_CONGESTION_DIGEST` | `buildFixtureCongestionBlock` | `upcomingHomeFixtures`, `upcomingAwayFixtures` |
| `LEAGUE_TABLE_DIGEST` | `buildLeagueTableDigestBlock` | Standings + stakes |
| `LEAGUE_SEASON_STATS_DIGEST` | `buildLeagueSeasonStatsDigestBlock` | Top scorers, team patterns |
| `ODDS_DIGEST` | `buildOddsDigestBlock` | SixLogics `availableData.odds` |
| `LOOPFEED_DIGEST` | `buildLoopFeedDigestBlock` | Pre-match social / press quotes |
| `MANUAL_SOURCE_DIGEST` | `buildManualSourceDigestBlock` | Team news, injury notes |
| `TEAM_NEWS_DIGEST` | `buildTeamNewsDigestBlock` | Manual sources filtered to injury/team-news types |
| `LINEUP_CONTEXT` | `buildLineupContextBlock` | Confirmed or predicted XI (labelled) |
| `STAKES_DIGEST` | `buildStakesDigestBlock` | Table stakes + competition context |
| `CONFIDENCE_AND_SKIPPED_LAYERS` | skipped layers + score | Data completeness |

### 2.2 Sections excluded from PIO (post-match only)

- `COMMENTARY_DIGEST`, `KEY_MOMENTS_TIMELINE`
- `OPTA_PLAYER_SUMMARIES` (post-match ratings)
- `INTERVIEW_TRANSCRIPTS` (post-match YouTube)
- `STORY_ENGINE_CONTEXT` with final score events (use `buildPreviewStoryContext` instead)

### 2.3 Implementation

- Module: [`app/lib/match-report/pio-summaries.ts`](../app/lib/match-report/pio-summaries.ts)
- Entry: `assemblePioPromptSections(project: MatchReportProject): string`

---

## 3. Preview workflow

### 3.1 Import layers (preview)

| Step | Layer | Default | Skip penalty |
|------|-------|---------|--------------|
| 1 | Fixture context (Six Logic) | Auto on foundation | −8 |
| 2 | League table | Recommended | −8 |
| 3 | League season stats | Recommended | −6 |
| 4 | Loop Feed | Recommended | −15 |
| 5 | Manual sources (team news) | Optional | −5 |

**Skipped by default for previews:** Six Logic commentary, WhoScored, interviews.

Module: [`app/lib/match-report/preview-workflow.ts`](../app/lib/match-report/preview-workflow.ts)

### 3.2 Generation pipeline (preview)

| Step | Report (today) | Preview (V1) |
|------|----------------|--------------|
| Build picture | Post-match key moments | Pre-match angles: form, H2H, stakes, team news |
| Player intelligence | Post-match ratings | **Skipped** (or V2: "ones to watch") |
| Transcripts | Post-match YouTube | **Skipped** (V2: presser transcripts) |
| Image intelligence | Match action hero | Team badges / preview graphic |
| Media builder | Report + 16 conclusions + ratings | Preview HTML per `MATCH_PREVIEW_PLANET_SPORT_PROMPT` |
| Fact check | Score/goals/possession | Fabrication checks (team news, line-ups, odds) |

### 3.3 Workflow steps (preview-specific)

Import: `preview_fixture_context` → `league_table` → `league_stats` → `loop_feed` → `manual_sources`  
Generation: `build_picture` → `image_intelligence` → `media_builder` → `fact_check` → `review`

Foundation steps (`match_id`, `sixlogic_core`, `competition_rules`) are shared with reports.

---

## 4. Schedule & calendar UX

### 4.1 Calendar fixture extensions

`MatchReportCalendarFixture` gains optional preview fields:

- `previewProjectId`, `previewCompletedAt`, `previewDisplayLabel`

Report fields unchanged: `reportProjectId`, `reportCompletedAt`, `reportDisplayLabel`.

### 4.2 Per-brand schedule status

Each fixture row shows **two** status chips per brand:

| Content | Status values | Deep-link param |
|---------|---------------|-----------------|
| Preview | not_started / in_progress / complete | `content_type=match_preview` |
| Report | not_started / in_progress / complete | `content_type=match_report` (default) |

Module: [`app/lib/match-report/schedule-brand-status.ts`](../app/lib/match-report/schedule-brand-status.ts)

### 4.3 Schedule table layout

```
| Fixture | Kickoff | F365 Preview | F365 Report | TT Preview | TT Report | … |
```

- **Start preview** → `/match-report-builder?match_id=…&brand=football365&content_type=match_preview`
- **Start report** → existing deep-link (defaults to report)
- **Continue** → `?project={id}` when project exists

### 4.4 Editorial calendar

- Preview projects link with `calendarPhase: "pre_match"`.
- Report projects link with `calendarPhase: "report_post"`.
- Same parent calendar event can hold both project IDs.

---

## 5. Preview fact-check rules

Module: [`app/lib/match-report/preview-fact-check.ts`](../app/lib/match-report/preview-fact-check.ts)

Deterministic checks (no LLM):

| Rule ID | Severity | Check |
|---------|----------|-------|
| `preview-invented-score` | high | Final score pattern in HTML when match not played |
| `preview-unconfirmed-lineup` | medium | Named starting XI without "predicted" / "expected" qualifier when lineups not in Tier 1 |
| `preview-un sourced-injury` | high | Injury/suspension claim not traceable to manual sources or Loop Feed digest |
| `preview-odds-without-disclaimer` | medium | Odds mentioned without responsible gambling line |
| `preview-missing-kickoff-context` | low | No kickoff date/time when foundation has kickoff |
| `preview-team-name-mismatch` | high | Home/away names in headline differ from foundation |

**Article score** reuses same 7 dimensions as reports but omits score-reversal checks.

Publish gate: `blocked` only on high-severity Tier 1 fabrication issues.

---

## 6. Migration from Data Studio preview

Module: [`app/lib/match-report/preview-migration.ts`](../app/lib/match-report/preview-migration.ts)

### 6.1 Current state (Data Studio)

- File: `app/lib/data-studio/match-copy-ai.ts`
- Mode: `MatchCopyMode = "preview"`
- Input: raw `FIXTURE_JSON` (120k chars) + optional Loop Feed
- Prompt: `MATCH_PREVIEW_PLANET_SPORT_PROMPT`
- No workflow, fact-check, calendar, or PIO

### 6.2 Migration phases

| Phase | Action |
|-------|--------|
| **V1** | Match Report Builder accepts `contentType: "match_preview"`; PIO assembly; preview fact-check; schedule dual columns |
| **V1.1** | `generate-preview-media.ts` uses PIO + `MATCH_PREVIEW_PLANET_SPORT_PROMPT` |
| **V2** | Data Studio preview mode shows banner: "Use Match Report Builder for previews" |
| **V2.1** | Data Studio preview routes to builder deep-link with fixture context |
| **V3** | Remove raw-JSON preview path from Data Studio |

### 6.3 Parity checklist

- [ ] Form + H2H from SixLogics (not raw JSON)
- [ ] Loop Feed integration
- [ ] League table + season stats
- [ ] Brand/creator governance
- [ ] Language Studio publish
- [ ] Fixture calendar linkage
- [ ] Fact-check for fabricated team news

---

## 7. Phased delivery

### MVP (V1.0)

- Types + PIO assembly + preview workflow constants
- Content type selection in wizard
- Schedule preview/report columns
- Preview fact-check module
- Calendar preview fields

### V1.1

- `build-preview-picture.ts` (PIO-driven)
- `generate-preview-media.ts`
- Preview-specific import step UI (hide post-match layers)

### V1.2

- "Ones to watch" optional step
- Press conference transcript import
- Odds section auto-populated from SixLogics

---

## 8. File index (new / modified)

| File | Role |
|------|------|
| `docs/match-preview-v1-spec.md` | This document |
| `app/lib/match-report/pio-summaries.ts` | PIO assembly |
| `app/lib/match-report/preview-workflow.ts` | Preview step lists |
| `app/lib/match-report/preview-fact-check.ts` | Preview fact-check |
| `app/lib/match-report/preview-migration.ts` | Migration helpers |
| `app/lib/match-report/schedule-brand-status.ts` | Dual preview/report status |
| `app/lib/match-report/content-type.ts` | `isMatchPreview()`, labels |
| `app/lib/match-report/types.ts` | Extended types |
| `app/lib/match-report/fixture-calendar.ts` | Preview calendar fields |
| `app/match-report-builder/components/MatchReportTypeStep.tsx` | Report vs Preview picker |

---

*End of Match Preview V1 specification.*
